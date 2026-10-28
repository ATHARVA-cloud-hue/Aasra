import { getTranslations } from "next-intl/server";
import { ACCEPTED_TYPES, readDocument, type ReadResult } from "@/lib/ai/documentReader";

/*
  POST /api/documents/read

  The browser sends the uploaded photo or PDF here. This runs on the
  server, which is the only place the Gemini key exists — the file goes
  to Google from here, never from the family's browser.

  We do not store the file. It is read, the details come back, and the
  bytes are forgotten. Only the few fields the family confirms are saved.

  Replies 200 with either { read: true, fields } or { read: false,
  reason }. It never substitutes sample details for a document it could
  not read — the browser decides what to show instead, because only the
  browser knows whether this is a demo or a real family's case.
*/

/** 15 MB. Comfortably under the request limit, and far above a phone photo. */
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  // The dictionary for this request's language, so the two messages
  // below are in whatever language the uploader is reading.
  const t = await getTranslations("documents.reader");

  let payload: ReadResult;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: t("errorNoFile") }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: t("errorTooLarge") },
        { status: 413 },
      );
    }

    // Some phones send an empty or odd type for HEIC photos; fall back to JPEG.
    const mimeType = ACCEPTED_TYPES.includes(file.type) ? file.type : "image/jpeg";

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    payload = await readDocument(base64, mimeType);
  } catch (error) {
    // Something we did not foresee. Say so honestly rather than crashing.
    console.error("Document read failed:", error instanceof Error ? error.message : error);
    payload = { read: false, reason: "server-error" };
  }

  return Response.json(payload);
}
