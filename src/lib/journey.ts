import { ALL_STATES } from "@/lib/landRecords";

/*
  THE FLOW — one source of truth for the order of the steps.

  Every step a family works through is listed here once, in order.
  Pages read this list to work out their own "Back" and "Continue"
  buttons, so no button can become a dead end: add a step here and the
  navigation on either side of it updates itself.

  NO USER-FACING TEXT LIVES IN THIS FILE.

  Headings, questions and help text are in messages/*.json, found by
  the keys below. That is what lets the same five steps appear in five
  languages. The shape of the flow is code; the words are data.
*/

export type Stage = {
  /** The URL for this step. Must match a folder in src/app. */
  href: string;
  /*
    Where this step's words live: stages.<key>.label, .title and
    .intro in every dictionary. Add a step and all five dictionaries
    need the matching entry.
  */
  key: string;
};

export const STAGES: Stage[] = [
  { href: "/intake", key: "intake" },
  { href: "/documents", key: "documents" },
  { href: "/heirs", key: "heirs" },
  { href: "/hidden-assets", key: "hiddenAssets" },
  { href: "/case", key: "case" },
];

/** Where in the list a step sits. Returns -1 if the href is not a step. */
export function stageIndex(href: string): number {
  return STAGES.findIndex((stage) => stage.href === href);
}

/*
  The step for a given href. Throws if the href is not in STAGES,
  because that can only mean a page and this list have drifted apart.
*/
export function stageFor(href: string): Stage {
  const stage = STAGES[stageIndex(href)];
  if (!stage) {
    throw new Error(`Unknown stage "${href}". Add it to STAGES in src/lib/journey.ts.`);
  }
  return stage;
}

/** The step after this one, or undefined if this is the last. */
export function nextStage(href: string): Stage | undefined {
  const index = stageIndex(href);
  return index === -1 ? undefined : STAGES[index + 1];
}

/** The step before this one, or undefined if this is the first. */
export function prevStage(href: string): Stage | undefined {
  const index = stageIndex(href);
  return index <= 0 ? undefined : STAGES[index - 1];
}

/*
  ---------------------------------------------------------------
  THE QUESTIONS inside the first step.

  Each question is its own URL (/intake/1, /intake/2 ...) so a family
  can close the page and return to the exact question they left on.
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
  // The optional questions that sharpen the recovery estimate. Every
  // one is skippable, and the estimate degrades gracefully without it.
  | "years_of_service"
  | "last_monthly_salary"
  | "property_state"
  // Chosen from buttons, stored as true / false / unknown
  | "has_will"
  | "assets_abroad"
  | "owned_business"
  | "mother_living"
  | "employed_at_death";

/*
  Where a choice question finds the labels for its buttons. The values
  themselves are below; only the words are looked up.
*/
export type OptionsNamespace = "intake.options" | "religion.options";

export type IntakeField = {
  /*
    The column this answer is saved into. Also the key its label,
    placeholder and note are found under:
    intake.steps.<slug>.fields.<name>.{label,placeholder,note}
  */
  name: IntakeFieldName;
  /*
    "long" draws a bigger box for lists. "choice" draws buttons.
    "number" draws a numeric box. "select" draws a dropdown, which is
    right where there are thirty options rather than three.
  */
  kind?: "text" | "date" | "long" | "choice" | "number" | "select";
  /** The values to pick between. Needed for "choice" and "select". */
  options?: string[];
  /** Which namespace holds the labels for those values. */
  optionsNamespace?: OptionsNamespace;
  /*
    True for a question nobody has to answer. Drawn with an
    "optional" marker, and the step says so at the top.
  */
  optional?: boolean;
  /** Smallest and largest sensible value, for a "number" field. */
  min?: number;
  max?: number;
  /*
    For a "choice" question saved into a true/false column:
    "yes" becomes true, "no" becomes false, and anything else
    (including "unsure") becomes unknown. We would rather record
    "we do not know" honestly than guess at a No.
  */
  savesAsYesNo?: boolean;
};

const YES_NO_UNSURE = ["yes", "no", "unsure"];

/*
  The faiths that decide which inheritance law applies in India.
  "private" (Prefer not to say) is a real, respected answer: the app
  falls back to the rules every succession law shares and lets a lawyer
  confirm.

  Exported because the same values are offered twice: here as question
  five, and on the home page as a way straight into "what the law says
  for your family". One list, so the two can never drift apart or offer
  a value the heirs engine does not recognise.
*/
export const RELIGION_VALUES = [
  "hindu",
  "muslim",
  "christian",
  "sikh",
  "buddhist",
  "jain",
  "parsi",
  "other",
  "private",
];

export type IntakeStep = {
  /*
    The bit that appears in the URL: /intake/<slug>. Also the key its
    question and help text are found under: intake.steps.<slug>.
  */
  slug: string;
  fields: IntakeField[];
};

export const INTAKE_STEPS: IntakeStep[] = [
  {
    slug: "1",
    fields: [{ name: "deceased_name" }, { name: "relationship" }],
  },
  {
    slug: "2",
    fields: [{ name: "date_of_death", kind: "date" }, { name: "place_of_death" }],
  },
  {
    slug: "3",
    fields: [{ name: "spouse_name" }, { name: "children_names", kind: "long" }],
  },
  {
    slug: "4",
    fields: [{ name: "known_assets_note", kind: "long" }],
  },
  {
    slug: "5",
    fields: [
      {
        name: "religion",
        kind: "choice",
        options: RELIGION_VALUES,
        optionsNamespace: "religion.options",
      },
    ],
  },
  {
    slug: "6",
    fields: [
      {
        name: "has_will",
        kind: "choice",
        options: YES_NO_UNSURE,
        optionsNamespace: "intake.options",
        savesAsYesNo: true,
      },
    ],
  },
  {
    slug: "7",
    fields: [
      {
        name: "mother_living",
        kind: "choice",
        options: YES_NO_UNSURE,
        optionsNamespace: "intake.options",
        savesAsYesNo: true,
      },
      { name: "mother_name" },
    ],
  },
  {
    slug: "8",
    fields: [
      {
        name: "assets_abroad",
        kind: "choice",
        options: YES_NO_UNSURE,
        optionsNamespace: "intake.options",
        savesAsYesNo: true,
      },
      {
        name: "owned_business",
        kind: "choice",
        options: YES_NO_UNSURE,
        optionsNamespace: "intake.options",
        savesAsYesNo: true,
      },
    ],
  },
  /*
    THE OPTIONAL QUESTIONS.

    Every field here is optional, and the step says so plainly. They
    exist only to sharpen the recovery estimate: a salary and a length
    of service turn a wide placeholder range into a real calculation
    from the statutory formulas, and a state name picks the right land
    record portal.

    Left blank, the estimate still works. It simply shows the wider
    ranges and asks the family to come back if they find a payslip.
  */
  {
    slug: "9",
    fields: [
      {
        name: "employed_at_death",
        kind: "choice",
        options: YES_NO_UNSURE,
        optionsNamespace: "intake.options",
        savesAsYesNo: true,
        optional: true,
      },
      { name: "years_of_service", kind: "number", optional: true, min: 0, max: 60 },
      { name: "last_monthly_salary", kind: "number", optional: true, min: 0, max: 10000000 },
      {
        name: "property_state",
        kind: "select",
        options: ALL_STATES,
        optional: true,
      },
    ],
  },
];

/** Where in the list of questions a step sits. Returns -1 if unknown. */
export function intakeStepIndex(slug: string): number {
  return INTAKE_STEPS.findIndex((step) => step.slug === slug);
}

/** The first question's URL — what "start here" should point at. */
export const FIRST_INTAKE_HREF = `/intake/${INTAKE_STEPS[0].slug}`;

/** The last question's URL — what the next step's "Back" points at. */
export const LAST_INTAKE_HREF = `/intake/${INTAKE_STEPS[INTAKE_STEPS.length - 1].slug}`;
