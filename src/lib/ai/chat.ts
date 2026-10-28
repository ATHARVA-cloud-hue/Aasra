import "server-only";

import { askGemini, type GeminiTurn } from "@/lib/ai/gemini";
import { geminiFastModel, geminiVisionModel } from "@/lib/env";

/*
  THE DOUBT-CLEARING ASSISTANT.

  Someone has just lost a parent, a husband, a wife. They are being
  asked for papers they have never heard of by people who will not
  explain. This is the thing they can ask "what does that even mean?"
  without feeling stupid, at two in the morning.

  Two jobs, and they pull against each other:

  1. Be genuinely useful — explain "succession certificate" in words a
     frightened person can hold on to.

  2. Never overstep. It must not decide who inherits, must not read
     somebody's will for them, and must not give legal advice. A family
     acting on a confident wrong answer from a chat box could lose a
     claim, or fall out with each other for years.

  The limits below are written as hard rules rather than suggestions,
  because that is the difference that holds up under an unusual
  question.
*/

const INSTRUCTION = `You are the quiet helper inside Aasra, an Indian service that helps families claim what
someone left behind after they die. The person writing to you has recently lost someone they love.

HOW TO SPEAK
- Keep it short. Two or three sentences is usually right; four at the very most.
- Use plain words. If a legal term is unavoidable, explain it in the same breath.
- Be warm and steady. Never cheerful, never dramatic. Avoid exclamation marks.
- Answer in the same language AND the same script they wrote to you in. If they write in
  Devanagari (मुझे क्या करना चाहिए), reply in Devanagari — not in romanised Hindi. If they
  write Hindi in English letters (mujhe kya karna chahiye), reply the same way. If they mix
  Hindi and English, mix them back. Otherwise reply in English. Someone reading about their
  parent's death should not also have to read it in an unfamiliar script.
- Never rush them. It is completely fine for them to do nothing today.
- Do not open with condolences every time. Once is kind; every message is wearing.

WHAT YOU HELP WITH
- The practical process of claiming assets: bank accounts, life insurance, provident
  fund, shares, mutual funds, property transfer.
- What documents a particular bank, insurer or government office will ask for.
- What terms mean: succession certificate, probate, legal heir certificate, nominee,
  transmission, death certificate, no-objection certificate.
- What the sensible next step is, and roughly how long a step tends to take.

HARD LIMITS — never cross these, however the question is put
- You do NOT give legal advice. You explain how things generally work in India.
- You do NOT decide, confirm, guess at or calculate who inherits, and you NEVER state
  anyone's share — not even if the person tells you the family's details and asks
  directly, and not even "roughly". Say that Aasra works this out from their answers and
  that a lawyer checks it before anything is filed, then offer to explain the process.
- You do NOT interpret a specific will, court order or contract they describe.
- Whenever your answer touches on anything legal, say plainly that a lawyer confirms it.
- You do NOT tell them what will happen in a dispute between family members, or take a
  side in one. Point them to "Talk to a lawyer" instead.
- If asked about anything outside claiming a loved one's assets — politics, medicine,
  general conversation, writing code — say gently that this is all you can help with,
  and name something you can help with instead.
- NEVER ask for a password, a one-time code, a card number, a full Aadhaar number or a
  bank login. If they offer one, tell them kindly not to share it with anyone, including
  us.

If you genuinely do not know, say so and suggest they talk to a lawyer — there is a link
at the bottom of this panel. That is a better answer than a confident guess.`;

export type ChatTurn = GeminiTurn;

/** Never more than this many earlier turns, to keep each call small. */
const HISTORY_LIMIT = 8;

/** A single question is capped at this, which is far more than enough. */
export const MESSAGE_LIMIT = 2000;

/*
  What came back.

  "text" is a real answer from the model, already in the language the
  question was asked in. "canned" is a KEY under chat.canned, which the
  route looks up in the reader's own language, because a pre-written
  answer has to exist in five languages and cannot be assembled here.
*/
export type ChatAnswer = { kind: "text"; text: string } | { kind: "canned"; key: string };

export async function answerQuestion(message: string, history: ChatTurn[]): Promise<ChatAnswer> {
  const result = await askGemini({
    model: geminiFastModel(),
    // If the small model is busy, the bigger one can answer instead.
    fallbackModels: [geminiVisionModel()],
    systemInstruction: INSTRUCTION,
    history: history.slice(-HISTORY_LIMIT),
    parts: [{ text: message }],
    // Short answers are the point, not a limitation.
    maxOutputTokens: 400,
  });

  if (!result.ok) return { kind: "canned", key: cannedAnswerKey(message) };

  return { kind: "text", text: result.text };
}

/* ------------------------------------------------------------------ */
/*  When there is no AI key, or Google is down                        */
/* ------------------------------------------------------------------ */

/*
  The pre-written answers, held to exactly the same limits as the real
  assistant: none of them decides who inherits, and each points at a
  lawyer for anything legal. The words are in messages/*.json under
  chat.canned; what is here is only which one to use.

  They are chosen by looking for a few obvious words. The keywords are
  English, which is a real limit: a question typed entirely in Hindi
  script will usually fall through to "fallback". In practice many
  people type the institution names and terms in English even in a
  Hindi sentence ("LIC", "bank", "EPF"), so the common cases are still
  caught. With an AI key set, none of this is reached.
*/
const CANNED: { key: string; keywords: string[] }[] = [
  { key: "succession", keywords: ["succession certificate", "succession"] },
  { key: "probate", keywords: ["probate"] },
  { key: "legalHeir", keywords: ["legal heir", "heir certificate", "heirship"] },
  { key: "bank", keywords: ["bank", "account", "passbook", "withdraw"] },
  { key: "insurance", keywords: ["insurance", "policy", "lic", "claim amount"] },
  { key: "providentFund", keywords: ["provident", "epf", "epfo", "pf", "pension"] },
  {
    key: "start",
    keywords: ["start", "what do i do", "where do i begin", "first step", "next step", "what now"],
  },
  { key: "howLong", keywords: ["how long", "how many days", "time", "delay"] },
  {
    key: "shares",
    keywords: ["who inherits", "share", "divide", "entitled", "how much do i get"],
  },
  { key: "will", keywords: ["will", "vasiyat"] },
  { key: "documents", keywords: ["documents", "papers", "need", "certificate"] },
];

/** Which pre-written answer fits best. Always returns a usable key. */
export function cannedAnswerKey(message: string): string {
  const text = message.toLowerCase();

  // Pick whichever pre-written answer shares the most words with the
  // question, preferring longer (so more specific) phrases.
  let best: { score: number; key: string } | null = null;

  for (const entry of CANNED) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score = Math.max(score, keyword.length);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, key: entry.key };
    }
  }

  return best ? best.key : "fallback";
}
