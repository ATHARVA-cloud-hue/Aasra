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

export type ChatAnswer = {
  reply: string;
  /** "gemini" = really answered. "demo" = a pre-written sample answer. */
  source: "gemini" | "demo";
};

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

  if (!result.ok) {
    return { reply: cannedAnswer(message), source: "demo" };
  }

  return { reply: result.text, source: "gemini" };
}

/* ------------------------------------------------------------------ */
/*  When there is no AI key, or Google is down                        */
/* ------------------------------------------------------------------ */

/*
  Written by hand, and held to exactly the same limits as the real
  assistant: none of them decides who inherits, and each points at a
  lawyer for anything legal. They are chosen by looking for a few
  obvious words, so a demo asking the likely questions still gets a
  sensible reply rather than a shrug.
*/
const CANNED: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["succession certificate", "succession"],
    reply:
      "A succession certificate is a paper from a civil court saying who may collect a person's money and " +
      "investments. Banks often ask for one when there was no will and no nominee. It usually takes a few months, " +
      "and a lawyer prepares the application — we can arrange that for you.",
  },
  {
    keywords: ["probate"],
    reply:
      "Probate is a court confirming that a will is genuine, so banks and offices will act on it. It is only needed " +
      "where there is a will. A lawyer handles the filing, and we can take you through what it involves.",
  },
  {
    keywords: ["legal heir", "heir certificate", "heirship"],
    reply:
      "A legal heir certificate is a local government document naming the close family of someone who has died. It " +
      "is quicker and cheaper than a succession certificate, though some banks will not accept it on its own. The " +
      "tehsil or municipal office issues it.",
  },
  {
    keywords: ["bank", "account", "passbook", "withdraw"],
    reply:
      "For a bank claim you will usually need the death certificate, your own ID, the bank's claim form, and the " +
      "passbook or account number. If you were named as nominee it is fairly quick; if not, the bank may ask for a " +
      "succession certificate. We can tell you which applies once we know the account.",
  },
  {
    keywords: ["insurance", "policy", "lic", "claim amount"],
    reply:
      "For a life insurance claim the insurer normally wants the original policy, the death certificate, their claim " +
      "form, and proof of the bank account the money should go to. If the policy document is lost, do not worry — the " +
      "insurer can trace it from the policy number or the person's details.",
  },
  {
    keywords: ["provident", "epf", "epfo", "pf", "pension"],
    reply:
      "Provident fund money is claimed from EPFO using forms 20, 5-IF and 10-D, along with the death certificate and " +
      "Aadhaar. There is often a pension and an insurance amount owed too, which families are rarely told about.",
  },
  {
    keywords: ["start", "what do i do", "where do i begin", "first step", "next step", "what now"],
    reply:
      "Start with the death certificate — almost every office will ask for it, and nothing else moves without it. " +
      "After that, answer whatever questions you can in this app, and we will work out who needs to be told and in " +
      "what order. There is no hurry today.",
  },
  {
    keywords: ["how long", "how many days", "time", "delay"],
    reply:
      "It varies. A bank claim with a nominee can be a few weeks; one needing a court certificate is usually three to " +
      "six months. Insurance is often six to eight weeks. We will tell you what is waiting on whom, so the silence " +
      "never feels like nothing is happening.",
  },
  {
    keywords: ["who inherits", "share", "divide", "entitled", "how much do i get"],
    reply:
      "I am not able to work out shares — that depends on which law applies to your family and whether there was a " +
      "will, and getting it wrong would be serious. Answer the questions in this app and we will set it out for you, " +
      "with a lawyer confirming it before anything is filed.",
  },
  {
    keywords: ["will", "vasiyat"],
    reply:
      "If there is a will, it decides who inherits rather than the general law — but it has to be shown to be genuine " +
      "first, which is what probate does. Bring it to us and a lawyer will read it with you and explain it plainly.",
  },
  {
    keywords: ["documents", "papers", "need", "certificate"],
    reply:
      "The death certificate is the one everything depends on. Beyond that it is usually their ID, your ID, and " +
      "whatever paperwork relates to the account or policy — a passbook, a statement, a policy number. Even a photo " +
      "of an old document helps.",
  },
];

const FALLBACK =
  "I am not able to answer that just now. You can ask me what a document means, what a bank or insurer will want " +
  "from you, or what the next step is — and if it would help to talk to a lawyer instead, there is a link for that " +
  "at the bottom of this panel.";

export function cannedAnswer(message: string): string {
  const text = message.toLowerCase();

  // Pick whichever pre-written answer shares the most words with the
  // question, preferring longer (so more specific) phrases.
  let best: { score: number; reply: string } | null = null;

  for (const entry of CANNED) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score = Math.max(score, keyword.length);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, reply: entry.reply };
    }
  }

  return best ? best.reply : FALLBACK;
}
