import { getTranslations } from "next-intl/server";
import { answerQuestion, cannedAnswerKey, MESSAGE_LIMIT, type ChatTurn } from "@/lib/ai/chat";

/*
  POST /api/chat

  The browser sends a question, the last few turns of conversation, and
  the language the page is in. This runs on the server, which is the
  only place the Gemini key exists: the question goes to Google from
  here, never from the family's browser.

  Nothing is stored. Each question arrives with its own short history
  from the browser, so there is no transcript of a grieving family's
  worries sitting on our server.

  Always replies 200 with { reply, source }. If Gemini has no key, is
  busy, or fails, a pre-written answer comes back instead, in the
  language of the page. A chat box that returns an error to somebody in
  this position is worse than one that answers plainly.
*/

export async function POST(request: Request) {
  /*
    The dictionary is loaded from the cookie on this request, so every
    pre-written answer and every error on this route is in the language
    the person is reading. Loaded before the try, so even the catch at
    the bottom can answer in the right language.
  */
  const t = await getTranslations("chat");

  try {
    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
      locale?: unknown;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json({ error: t("errorEmpty") }, { status: 400 });
    }

    if (message.length > MESSAGE_LIMIT) {
      return Response.json({ error: t("errorTooLong") }, { status: 413 });
    }

    const answer = await answerQuestion(message, readHistory(body.history));

    /*
      A real answer comes back as text, already in the language the
      question was asked in, because the model is told to reply in it.
      A fallback comes back as a KEY, and is looked up here.
    */
    return Response.json({
      reply: answer.kind === "text" ? answer.text : t(`canned.${answer.key}`),
      source: answer.kind === "text" ? "gemini" : "demo",
    });
  } catch (error) {
    console.error("Chat failed:", error instanceof Error ? error.message : error);
    // Even a broken request gets a useful answer rather than an error.
    return Response.json({ reply: t(`canned.${cannedAnswerKey("")}`), source: "demo" });
  }
}

/*
  The history comes from the browser, so none of it is trusted. Only
  properly shaped turns are kept and anything else is thrown away,
  rather than passing a surprise along to Gemini.
*/
function readHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns: ChatTurn[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "model") || typeof text !== "string") continue;

    const trimmed = text.trim();
    if (!trimmed) continue;

    turns.push({ role, text: trimmed.slice(0, MESSAGE_LIMIT) });
  }

  return turns;
}
