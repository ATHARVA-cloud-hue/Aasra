import type { CaseRecord } from "@/lib/caseStore";

/*
  THE SAMPLE FAMILY — every piece of made-up data in the app, in one file.

  Why it all lives here: sample data is genuinely dangerous in an app
  like this. If a grieving family ever saw "Lakshmi Nair" where their
  own mother's name should be, they would rightly never trust us again.
  Keeping it in a single file means there is one place to check, and no
  page can quietly grow its own hardcoded family.

  Nothing in here is ever shown to a real case. The pages ask
  getMode() === "demo" first, and only then reach for these.

  (This is a type-only import, so the database layer is not pulled in.)

  ON LANGUAGES: the names, places and institutions below stay as they
  are in all five languages, because they are proper nouns. What the
  screens say ABOUT them is looked up from messages/*.json, by the keys
  in this file.
*/

/** The fictional family behind "Continue as a demo family". */
export const DEMO_CASE: CaseRecord = {
  deceased_name: "Suresh Kumar Nair",
  relationship: "father",
  date_of_death: "2024-03-02",
  place_of_death: "Pune",
  religion: "hindu",
  has_will: false,
  assets_abroad: false,
  owned_business: false,
  spouse_name: "Lakshmi Nair",
  children_names: "Arjun Nair\nMeera Nair",
  // Matches the four-person sample on the heirs page.
  mother_living: true,
  mother_name: "Sarasvati Nair",
  known_assets_note: "SBI savings account, an LIC policy, employed at Tata Motors",
};

/*
  What the document reader shows in demo mode when there is no AI key.

  This lives here, with the other sample data, rather than next to the
  reader itself — and that placement is the fix for a real bug. It used
  to be returned by the server whenever a Gemini call failed, which
  meant a genuine family whose upload hit a busy Google got this
  stranger's name and a fake certificate number typed into their own
  case, ready to save. Sample data now only ever comes from this file,
  and only ever after a getMode() check.

  document_kind and extra_notes are looked up from
  demo.documentFields.* rather than stored here, because those two are
  sentences rather than proper nouns.
*/
export const DEMO_DOCUMENT_FACTS = {
  person_name: "Suresh Kumar Nair",
  date_of_death: "2024-03-02",
  date_of_birth: "1958-07-14",
  place: "Pune",
  institution: "Pune Municipal Corporation",
  reference_number: "PMC/DC/2024/018842",
};

export type DemoTone = "waiting" | "moving" | "done";

/*
  The tracker rows on the "Your case" page. `id` is the key under
  demo.claims; `tone` decides the colour.
*/
export const DEMO_CLAIMS: { id: string; tone: DemoTone }[] = [
  { id: "savings", tone: "waiting" },
  { id: "insurance", tone: "moving" },
  { id: "providentFund", tone: "moving" },
  { id: "deathCertificate", tone: "done" },
];

/*
  The heir result on the "Who inherits" page. The relation is a key
  under demo.heirRelations.

  These four say "Son" and "Daughter" where the real engine
  deliberately says "Child". That is not an inconsistency: this is a
  fictional family whose genders we invented, so naming them is safe.
  For a real family the app was never told, and would not guess.
*/
export const DEMO_HEIRS = [
  { who: "Lakshmi Nair", relation: "spouse" },
  { who: "Arjun Nair", relation: "son" },
  { who: "Meera Nair", relation: "daughter" },
  { who: "Sarasvati Nair", relation: "mother" },
];

/** What each institution asks for. Keys under demo.checklist. */
export const CLAIM_CHECKLIST = ["bank", "insurer", "epfo", "shares"];

/** How the tracker colours each status. */
export const TONE_CLASSES: Record<DemoTone, string> = {
  waiting: "bg-clay-50 text-clay-700",
  moving: "bg-sage-50 text-sage-800",
  done: "bg-sage-100 text-sage-800",
};
