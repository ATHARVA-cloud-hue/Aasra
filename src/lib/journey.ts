/*
  THE JOURNEY — one source of truth for the order of the flow.

  Every stage a family walks through is listed here once, in order.
  Pages read this list to work out their own "Back" and "Continue"
  buttons, so no button can become a dead end: add a stage here and
  the navigation on either side of it updates itself.

  Keep the wording plain. These strings are shown to someone who has
  just lost a person they love.
*/

export type Stage = {
  /** The URL for this stage. Must match a folder in src/app. */
  href: string;
  /** Short name, used in the small progress strip at the top. */
  label: string;
  /** The page heading. */
  title: string;
  /** One calm sentence under the heading. */
  intro: string;
};

export const STAGES: Stage[] = [
  {
    href: "/intake",
    label: "Tell us",
    title: "Tell us a little",
    intro:
      "A few gentle questions, one at a time. There is no rush, and you can stop and come back whenever you need to.",
  },
  {
    href: "/documents",
    label: "Documents",
    title: "The documents you have",
    intro:
      "Photograph whatever you can find — a bank passbook, a policy, an Aadhaar card. If you have nothing yet, that is completely fine.",
  },
  {
    href: "/heirs",
    label: "Who inherits",
    title: "Who inherits, in plain words",
    intro:
      "Based on what you have told us, here is who the law treats as an heir — and the papers each bank or insurer will ask for.",
  },
  {
    href: "/hidden-assets",
    label: "Lost money",
    title: "Money your family may not know about",
    intro:
      "Forgotten bank accounts, old insurance policies, EPF and unclaimed shares. We help you look in the places most families never check.",
  },
  {
    href: "/case",
    label: "Your case",
    title: "Your case, all in one place",
    intro:
      "Everything you have shared, what has been claimed, and what is still waiting. Come back here any time to see where things stand.",
  },
];

/** Where in the list a stage sits. Returns -1 if the href is not a stage. */
export function stageIndex(href: string): number {
  return STAGES.findIndex((stage) => stage.href === href);
}

/*
  The stage for a given href. Throws if the href is not in STAGES,
  because that can only mean a page and this list have drifted apart.
*/
export function stageFor(href: string): Stage {
  const stage = STAGES[stageIndex(href)];
  if (!stage) {
    throw new Error(`Unknown stage "${href}". Add it to STAGES in src/lib/journey.ts.`);
  }
  return stage;
}

/** The stage after this one, or undefined if this is the last. */
export function nextStage(href: string): Stage | undefined {
  const index = stageIndex(href);
  return index === -1 ? undefined : STAGES[index + 1];
}

/** The stage before this one, or undefined if this is the first. */
export function prevStage(href: string): Stage | undefined {
  const index = stageIndex(href);
  return index <= 0 ? undefined : STAGES[index - 1];
}

/*
  ---------------------------------------------------------------
  THE INTAKE WIZARD — the questions inside the first stage.

  Each step is its own URL (/intake/1, /intake/2 ...) so a family
  can close the tab and return to the exact question they left on.
  ---------------------------------------------------------------
*/

/*
  Which column in the "cases" table an answer is saved into.

  These names are deliberately spelled out here rather than imported
  from the case store: this file is read by every page, and pulling the
  database layer in with it would send the whole Supabase library to
  pages that never touch it.
*/
export type IntakeFieldName =
  // Typed into a box
  | "deceased_name"
  | "relationship"
  | "date_of_death"
  | "place_of_death"
  | "spouse_name"
  | "children_names"
  | "known_assets_note"
  | "mother_name"
  | "religion"
  // Chosen from buttons, stored as true / false / unknown
  | "has_will"
  | "assets_abroad"
  | "owned_business"
  | "mother_living";

/** One button in a "choose one" question. */
export type IntakeOption = { value: string; label: string };

export type IntakeField = {
  /** The column this answer is saved into. */
  name: IntakeFieldName;
  label: string;
  /** Example text inside the empty box. */
  placeholder?: string;
  /** "long" draws a bigger box for lists. "choice" draws buttons. */
  kind?: "text" | "date" | "long" | "choice";
  /** The buttons to pick between. Needed when kind is "choice". */
  options?: IntakeOption[];
  /*
    For a "choice" question saved into a true/false column:
    "yes" becomes true, "no" becomes false, and anything else
    (including "Not sure") becomes unknown. We would rather record
    "we do not know" honestly than guess at a No.
  */
  savesAsYesNo?: boolean;
  /** A gentle line under the question — usually why we are asking. */
  note?: string;
};

const YES_NO: IntakeOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const YES_NO_UNSURE: IntakeOption[] = [...YES_NO, { value: "unsure", label: "Not sure" }];

/*
  The faiths that decide which inheritance law applies in India.
  "Prefer not to say" is a real, respected answer: we fall back to the
  general closest-family rules and let a lawyer confirm.

  Exported because the same list is now offered twice: here as question
  five of the wizard, and on the landing page as a way straight into
  "what the law says for your family". One list, so the two can never
  drift apart or offer a value the heirs engine does not recognise.
*/
export const RELIGIONS: IntakeOption[] = [
  { value: "hindu", label: "Hindu" },
  { value: "muslim", label: "Muslim" },
  { value: "christian", label: "Christian" },
  { value: "sikh", label: "Sikh" },
  { value: "buddhist", label: "Buddhist" },
  { value: "jain", label: "Jain" },
  { value: "parsi", label: "Parsi" },
  { value: "other", label: "Other" },
  { value: "private", label: "Prefer not to say" },
];

export type IntakeStep = {
  /** The bit that appears in the URL: /intake/<slug> */
  slug: string;
  question: string;
  help: string;
  fields: IntakeField[];
};

export const INTAKE_STEPS: IntakeStep[] = [
  {
    slug: "1",
    question: "Who are we helping you with?",
    help: "Just their name, and how they were related to you. Nothing else for now.",
    fields: [
      { name: "deceased_name", label: "Their full name", placeholder: "For example, Suresh Kumar Nair" },
      { name: "relationship", label: "They were my", placeholder: "For example, father" },
    ],
  },
  {
    slug: "2",
    question: "When did they pass away?",
    help: "If you are not sure of the exact date, roughly is fine. We can correct it later.",
    fields: [
      { name: "date_of_death", label: "Date", kind: "date" },
      { name: "place_of_death", label: "Town or city", placeholder: "For example, Pune" },
    ],
  },
  {
    slug: "3",
    question: "Who is in the immediate family?",
    help: "This is how we work out who inherits. You can add more people at any time.",
    fields: [
      { name: "spouse_name", label: "Their spouse's name, if any", placeholder: "Leave blank if there is none" },
      {
        name: "children_names",
        label: "Their children's names",
        placeholder: "One name per line is fine",
        kind: "long",
      },
    ],
  },
  {
    slug: "4",
    question: "What do you already know about?",
    help: "Even a rough list helps. Afterwards we go looking for whatever has been missed.",
    fields: [
      {
        name: "known_assets_note",
        label: "Any banks, insurers or employers you know of",
        placeholder: "For example: SBI savings account, an LIC policy, he worked at Tata Motors",
        kind: "long",
      },
    ],
  },
  {
    slug: "5",
    question: "Which faith did they follow?",
    help: "We ask only because the law requires it, and your answer stays private.",
    fields: [
      {
        name: "religion",
        label: "Their faith",
        kind: "choice",
        options: RELIGIONS,
        note:
          "In India, which inheritance law applies depends on this — a Hindu family and a Christian family " +
          "divide an estate differently. It stays private, and you may choose not to say.",
      },
    ],
  },
  {
    slug: "6",
    question: "Was there a will?",
    help: "Most families in India do not have one. If that is you, nothing is lost — the law decides instead.",
    fields: [
      {
        name: "has_will",
        label: "Did they leave a will?",
        kind: "choice",
        options: YES_NO_UNSURE,
        savesAsYesNo: true,
        note:
          "If there is a will, it decides who inherits and we help you prove it is genuine. If there is none, " +
          "the law sets out the shares. \"Not sure\" is a perfectly good answer — we can look together.",
      },
    ],
  },
  {
    slug: "7",
    question: "Is their mother still living?",
    help: "Under Hindu law a surviving mother inherits an equal share, so leaving her out would make the shares wrong.",
    fields: [
      {
        name: "mother_living",
        label: "Is their mother still living?",
        kind: "choice",
        options: YES_NO_UNSURE,
        savesAsYesNo: true,
      },
      {
        name: "mother_name",
        label: "Her name, if you know it",
        placeholder: "Leave blank if you would rather not, or do not know",
      },
    ],
  },
  {
    slug: "8",
    question: "A couple of last things",
    help: "These two answers tell us whether extra paperwork is coming, so nothing surprises you later.",
    fields: [
      {
        name: "assets_abroad",
        label: "Did they own anything outside India?",
        kind: "choice",
        options: YES_NO_UNSURE,
        savesAsYesNo: true,
        note: "A bank account, property or a policy in another country. This adds steps, but it is all doable.",
      },
      {
        name: "owned_business",
        label: "Did they run a business, or work for themselves?",
        kind: "choice",
        options: YES_NO_UNSURE,
        savesAsYesNo: true,
        note: "A shop, a firm, a company, or freelance work. A business is handled differently from a salary.",
      },
    ],
  },
];

/** Where in the wizard a step sits. Returns -1 for an unknown slug. */
export function intakeStepIndex(slug: string): number {
  return INTAKE_STEPS.findIndex((step) => step.slug === slug);
}

/** The first question's URL — what "start here" should point at. */
export const FIRST_INTAKE_HREF = `/intake/${INTAKE_STEPS[0].slug}`;

/** The last question's URL — what the next stage's "Back" points at. */
export const LAST_INTAKE_HREF = `/intake/${INTAKE_STEPS[INTAKE_STEPS.length - 1].slug}`;
