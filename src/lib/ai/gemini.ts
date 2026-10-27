import "server-only";

/*
  THE ONE PLACE WE TALK TO GOOGLE GEMINI.

  Everything AI in this app goes through this file, so there is a single
  place to look when something misbehaves.

  Two rules this file never breaks:
  1. The API key is read from process.env.GEMINI_API_KEY and nothing else.
     It never appears in code, never leaves the server, and is never
     included in anything we send to the browser.
  2. It never throws. Every failure comes back as { ok: false, reason }
     so the page above can quietly show its sample answer instead.
     A demo must never die on a red error screen.

  We use Google's "generateContent" endpoint. Google also has a newer
  "Interactions" API, but that one is still in Beta and warns about
  breaking changes, while generateContent is stable and fully supported.
*/

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** How long we wait for Gemini before giving up and using sample data. */
const TIMEOUT_MS = 30_000;

/*
  A "part" is one piece of what we send: either some text, or a file
  (a photo or PDF) as base64. A single request can mix both — that is
  how we say "here is a photo, now read it for me".
*/
export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** One earlier turn of a conversation, for the chat assistant. */
export type GeminiTurn = { role: "user" | "model"; text: string };

export type GeminiResult = { ok: true; text: string } | { ok: false; reason: string };

export type GeminiRequest = {
  model: string;
  /** What we are sending right now. */
  parts: GeminiPart[];
  /** The standing instruction that shapes how Gemini behaves. */
  systemInstruction?: string;
  /** Earlier turns of the conversation, oldest first. */
  history?: GeminiTurn[];
  /*
    A JSON Schema. When given, Gemini is forced to reply with JSON in
    exactly this shape instead of a chatty sentence.
    Note: this endpoint wants UPPERCASE type names — OBJECT, STRING,
    ARRAY, BOOLEAN — not the lowercase ones used elsewhere.
  */
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  /*
    Other models to try, in order, if the first one is too busy.
    Google's free tier returns "503 high demand" surprisingly often on
    the bigger models, so a smaller one standing by is the difference
    between a real answer and sample data.
  */
  fallbackModels?: string[];
};

/*
  Failures worth trying another model for. A 404 (wrong model name) or a
  400 (our mistake) will fail identically every time, so we do not retry
  those — we only retry "busy" and "flaky connection".
*/
function worthRetrying(reason: string): boolean {
  return (
    reason === "network" ||
    reason === "http-429" || // too many requests this minute
    reason === "http-500" ||
    reason === "http-502" ||
    reason === "http-503" || // the model is overloaded
    reason === "http-504"
  );
}

export async function askGemini(request: GeminiRequest): Promise<GeminiResult> {
  const models = [request.model, ...(request.fallbackModels ?? [])];
  let last: GeminiResult = { ok: false, reason: "no-model" };

  for (const model of models) {
    last = await askOneModel({ ...request, model });
    if (last.ok) return last;
    if (!worthRetrying(last.reason)) return last;
    if (model !== models[models.length - 1]) {
      console.warn(`Gemini model "${model}" was unavailable (${last.reason}); trying the next one.`);
    }
  }

  return last;
}

async function askOneModel(request: GeminiRequest): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };

  // Earlier turns first, then what we are asking now.
  const contents = [
    ...(request.history ?? []).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user" as const, parts: request.parts },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: request.maxOutputTokens ?? 1024,
      // A low temperature keeps answers steady and factual rather than
      // creative — the right choice for both reading documents and for
      // explaining paperwork to a grieving family.
      temperature: 0.2,
      ...(request.responseSchema
        ? { responseMimeType: "application/json", responseSchema: request.responseSchema }
        : {}),
    },
  };

  if (request.systemInstruction) {
    body.systemInstruction = { parts: [{ text: request.systemInstruction }] };
  }

  try {
    const response = await fetch(`${ENDPOINT}/${request.model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Read the message but never log the key. A 404 here almost always
      // means the model name has moved on; 429 means the free tier's
      // limit for the minute is used up.
      const detail = await response.text().catch(() => "");
      console.error(`Gemini ${response.status}: ${detail.slice(0, 300)}`);
      return { ok: false, reason: `http-${response.status}` };
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    // The answer sits in candidates[0].content.parts[*].text. Occasionally
    // it arrives split across several parts, so join them.
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) return { ok: false, reason: "empty" };
    return { ok: true, text };
  } catch (error) {
    // A timeout, no internet, or anything else unexpected.
    console.error("Gemini call failed:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "network" };
  }
}

/*
  Same thing, but for when we asked for JSON. Parses the reply and hands
  back a plain object, or ok:false if Gemini sent something unparseable.
*/
export async function askGeminiForJson<T>(
  request: GeminiRequest & { responseSchema: Record<string, unknown> },
): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
  const result = await askGemini(request);
  if (!result.ok) return result;

  try {
    return { ok: true, data: JSON.parse(result.text) as T };
  } catch {
    return { ok: false, reason: "bad-json" };
  }
}
