import "server-only";

import { askGeminiForJson } from "@/lib/ai/gemini";
import { geminiFastModel, geminiVisionModel } from "@/lib/env";

/*
  READING A FAMILY'S DOCUMENT.

  A family photographs a death certificate, a bank passbook, an LIC
  policy or an Aadhaar card. We send that image (or PDF) to Gemini and
  ask it to pull out the few details that actually save them typing.

  We deliberately ask for very little. Every field is one a family would
  otherwise have to copy by hand, and every field is shown back to them
  to correct before anything is saved.
*/

/** The fields we try to find. Anything not on the document comes back "". */
export type ExtractedFields = {
  document_kind: string;
  person_name: string;
  date_of_death: string; // YYYY-MM-DD
  date_of_birth: string; // YYYY-MM-DD
  place: string;
  institution: string;
  reference_number: string;
  extra_notes: string;
};

export const EMPTY_FIELDS: ExtractedFields = {
  document_kind: "",
  person_name: "",
  date_of_death: "",
  date_of_birth: "",
  place: "",
  institution: "",
  reference_number: "",
  extra_notes: "",
};

/*
  The shape Gemini must reply in. Because we pass this as a schema,
  Gemini returns JSON with exactly these keys — no stray prose to
  untangle. This endpoint wants UPPERCASE type names.
*/
const SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    document_kind: {
      type: "STRING",
      description:
        'What this document is, in plain English. For example "Death certificate", ' +
        '"Bank passbook", "Life insurance policy", "Aadhaar card", "PAN card". ' +
        'Use "Unknown" if it is not clear.',
    },
    person_name: {
      type: "STRING",
      description:
        "The full name of the person the document is about, exactly as printed. " +
        'Empty string if there is no name.',
    },
    date_of_death: {
      type: "STRING",
      description:
        "The date of death as YYYY-MM-DD. Empty string if the document does not " +
        "state a date of death. Never guess.",
    },
    date_of_birth: {
      type: "STRING",
      description: "The date of birth as YYYY-MM-DD, or empty string.",
    },
    place: {
      type: "STRING",
      description:
        "The town or city on the document — place of death, or the branch's city. " +
        "Empty string if none.",
    },
    institution: {
      type: "STRING",
      description:
        'The bank, insurer, employer or office named on the document. For example ' +
        '"State Bank of India", "LIC of India", "EPFO", "Pune Municipal Corporation". ' +
        "Empty string if none.",
    },
    reference_number: {
      type: "STRING",
      description:
        "The main account, policy, certificate or registration number, exactly as " +
        "printed. If there are several, give the most important one. Empty string if none.",
    },
    extra_notes: {
      type: "STRING",
      description:
        "At most one short sentence about anything else useful a family should know " +
        "from this document. Empty string if there is nothing worth adding.",
    },
  },
  required: [
    "document_kind",
    "person_name",
    "date_of_death",
    "date_of_birth",
    "place",
    "institution",
    "reference_number",
    "extra_notes",
  ],
};

const INSTRUCTION = `You read Indian legal, bank and insurance documents and pull out a few key details.

Rules you must follow:
- Copy what is printed. Never guess, never fill a gap with something plausible.
- If a detail is not on the document, return an empty string for it.
- Documents may be in Hindi, Marathi, Tamil, Bengali or any Indian language, or a
  mix with English. Read them, and give names and places in English letters.
- Photos may be crooked, dim, creased or partly cut off. Read what you can.
- Indian dates are usually DD/MM/YYYY or DD-MM-YYYY. Convert them to YYYY-MM-DD.
  "02/03/2024" means 2 March 2024, not 3 February.
- Copy account, policy and certificate numbers digit by digit. These matter more
  than anything else on the page. If a digit is genuinely unreadable, leave the
  whole number empty rather than inventing one.`;

/** The file types we accept. Gemini can read all of these. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

/*
  Either we read the document or we did not. This file never invents a
  stand-in.

  It used to hand back sample details on failure, which read nicely in
  a demo and was dangerous in real life: a family whose upload hit a
  busy Google got a stranger's name and a made-up certificate number
  filled into their own case. Deciding to show sample data needs to
  know whether this is a demo, and only the browser knows that — so
  the choice is made there, not here.
*/
export type ReadResult =
  | { read: true; fields: ExtractedFields }
  | { read: false; reason: string };

export async function readDocument(base64: string, mimeType: string): Promise<ReadResult> {
  const result = await askGeminiForJson<ExtractedFields>({
    model: geminiVisionModel(),
    // If the bigger model is busy, the small one can read a document too.
    fallbackModels: [geminiFastModel()],
    systemInstruction: INSTRUCTION,
    responseSchema: SCHEMA,
    maxOutputTokens: 800,
    parts: [
      { inlineData: { mimeType, data: base64 } },
      // Google advises putting the question after the file, not before.
      { text: "Read this document and pull out the details." },
    ],
  });

  if (!result.ok) return { read: false, reason: result.reason };

  // Trust the schema, but not blindly: make sure every key exists and is a
  // string, so the page can never crash on a missing field.
  return { read: true, fields: clean(result.data) };
}

function clean(raw: Partial<ExtractedFields>): ExtractedFields {
  const out = { ...EMPTY_FIELDS };
  for (const key of Object.keys(EMPTY_FIELDS) as (keyof ExtractedFields)[]) {
    const value = raw[key];
    out[key] = typeof value === "string" ? value.trim() : "";
  }

  // Gemini sometimes writes "not stated" or "N/A" instead of leaving a
  // field empty. Treat those as empty so we never save them into a case.
  const nothing = /^(n\/?a|none|not (stated|found|available|mentioned|visible)|unknown|-{1,2})$/i;
  for (const key of Object.keys(out) as (keyof ExtractedFields)[]) {
    if (key !== "document_kind" && nothing.test(out[key])) out[key] = "";
  }

  // A date we cannot trust is worse than no date at all.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date_of_death)) out.date_of_death = "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date_of_birth)) out.date_of_birth = "";

  return out;
}
