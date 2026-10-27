import { answerQuestion, cannedAnswer, MESSAGE_LIMIT, type ChatTurn } from "@/lib/ai/chat";

/*
  POST /api/chat

  The browser sends a question and the last few turns of conversation.
  This runs on the server, which is the only place the Gemini key
  exists — the question goes to Google from here, never from the
  family's browser.

  Nothing is stored. Each question arrives with its own short history
  from the browser, so there is no transcript of a grieving family's
  worries sitting on our server.

  Always replies 200 with { reply, source }. If Gemini has no key, is
  busy, or fails, a pre-written answer comes back instead. A chat box
  that returns an error to someone in this position is worse than one
  that answers plainly.
*/

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return Response.json({ error: "Please type a question first." }, { status: 400 });
    }

    if (message.length > MESSAGE_LIMIT) {
      return Response.json(
        { error: "That question is very long. Could you shorten it a little?" },
        { status: 413 },
      );
    }

    return Response.json(await answerQuestion(message, readHistory(body.history)));
  } catch (error) {
    console.error("Chat failed:", error instanceof Error ? error.message : error);
    // Even a broken request gets a useful answer rather than a red error.
    return Response.json({ reply: cannedAnswer(""), source: "demo" });
  }
}

/*
  The history comes from the browser, so none of it is trusted. We keep
  only properly shaped turns and throw away anything else, rather than
  passing a surprise along to Gemini.
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
