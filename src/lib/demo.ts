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
*/

/** The fictional family behind "Continue as a demo family". */
export const DEMO_CASE: CaseRecord = {
  deceased_name: "Suresh Kumar Nair",
  relationship: "father",
  date_of_death: "2024-03-02",
  place_of_death: "Pune",
  religion: "Hindu",
  has_will: false,
  assets_abroad: false,
  owned_business: false,
  spouse_name: "Lakshmi Nair",
  children_names: "Arjun Nair\nMeera Nair",
  // Matches the four-person sample on the heirs page.
  mother_living: true,
  mother_name: "Sarasvati Nair",
  known_assets_note: "SBI savings account, an LIC policy, he worked at Tata Motors",
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
*/
export const DEMO_DOCUMENT_FIELDS = {
  document_kind: "Death certificate (sample)",
  person_name: "Suresh Kumar Nair",
  date_of_death: "2024-03-02",
  date_of_birth: "1958-07-14",
  place: "Pune",
  institution: "Pune Municipal Corporation",
  reference_number: "PMC/DC/2024/018842",
  extra_notes: "Registered nine days after the date of death, which is well within the limit.",
};

export type DemoTone = "waiting" | "moving" | "done";

/** The tracker rows on the "Your case" page. */
export const DEMO_CLAIMS: { what: string; where: string; status: string; tone: DemoTone }[] = [
  { what: "Savings account", where: "State Bank of India", status: "Needs your signature", tone: "waiting" },
  { what: "Life insurance", where: "LIC policy 4471xxxx", status: "With the insurer", tone: "moving" },
  { what: "Provident fund", where: "EPFO", status: "With the office", tone: "moving" },
  { what: "Death certificate", where: "Municipal corporation", status: "Received", tone: "done" },
];

/** The heir result on the "Who inherits" page. */
export const DEMO_HEIRS = [
  { who: "Lakshmi Nair", relation: "Wife", share: "One equal share" },
  { who: "Arjun Nair", relation: "Son", share: "One equal share" },
  { who: "Meera Nair", relation: "Daughter", share: "One equal share" },
  { who: "Sarasvati Nair", relation: "Mother", share: "One equal share" },
];

export const DEMO_HEIRS_WHY =
  "Why: with no will, the Hindu Succession Act gives the wife, children and mother an equal share each.";

/** What each institution asks for. True for any family, so not really "sample". */
export const CLAIM_CHECKLIST = [
  {
    place: "The bank",
    needs: "Death certificate, your ID, their claim form, and a nominee letter or succession certificate.",
  },
  {
    place: "The insurer",
    needs: "Original policy, death certificate, claim form, and proof of your bank account.",
  },
  {
    place: "EPFO (provident fund)",
    needs: "Forms 20, 5-IF and 10-D, death certificate, and Aadhaar.",
  },
  {
    place: "Shares and mutual funds",
    needs: "A transmission request, death certificate, and a notarised affidavit.",
  },
];

/** How the tracker colours each status. */
export const TONE_CLASSES: Record<DemoTone, string> = {
  waiting: "bg-clay-50 text-clay-700",
  moving: "bg-sage-50 text-sage-800",
  done: "bg-sage-100 text-sage-800",
};
