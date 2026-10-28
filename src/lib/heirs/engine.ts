/*
  WHO INHERITS — a deliberately simple first pass.

  This file takes what a family entered and works out who the law is
  likely to treat as an heir, with a share and a reason.

  ------------------------------------------------------------------
  READ THIS BEFORE CHANGING ANYTHING HERE
  ------------------------------------------------------------------
  Indian succession law is genuinely complicated. It differs by faith,
  by whether there is a will, by whether property is ancestral, by
  which school of law a family follows, and by case law that moves.
  What is below is a SIMPLIFICATION, good enough to tell a family what
  to expect and what to ask about, and nothing more than that.

  Three rules this file holds to:

  1. Nothing here is ever marked verified. Every result carries
     lawyerVerified: false, and the screen shows that plainly. A
     lawyer checks it before anything is filed.

  2. Where the real calculation is beyond a simple rule, Muslim
     personal law especially, the app does NOT invent fractions. It
     names the likely heirs and says plainly that a lawyer works out
     the shares. A confidently wrong fraction is far worse than an
     honest gap: a family might divide money on the strength of it.

  3. The app never guesses at a fact it was not given. No spouse named
     means no spouse in the result, not an assumed one.

  ------------------------------------------------------------------
  WHY THIS FILE RETURNS KEYS, NOT SENTENCES
  ------------------------------------------------------------------
  It used to return English prose, assembled here. It cannot any more,
  because the result has to read correctly in five languages.

  So each result now carries the KEY of a message plus the VALUES that
  message needs, and the screen looks the words up. Shares travel as a
  numerator and a denominator rather than as "a third", because "a
  third of the estate" cannot be translated by a dictionary lookup
  while "1/3" can, and a numeral is plainer to read under stress.

  It is still a pure function: give it the same answers and it returns
  the same result, with no database, no network and no language. That
  makes it easy to check by hand, which matters for something this
  consequential.
*/

/** Just the answers the calculation needs. A CaseRecord fits this. */
export type HeirInput = {
  religion?: string | null;
  spouse_name?: string | null;
  children_names?: string | null;
  mother_living?: boolean | null;
  mother_name?: string | null;
  has_will?: boolean | null;
};

/** A share as a plain fraction. 1/1 means the whole estate. */
export type Fraction = { top: number; bottom: number };

export type HeirShare = {
  name: string;
  /*
    "spouse", "child" or "mother" — a key under heirs.relations, never
    a label. We say spouse and child, never "wife", "son" or
    "daughter": the app was never told anyone's gender, and a name is
    not evidence of it. Getting that wrong on a page about somebody's
    dead parent is not a small thing.
  */
  relationKey: "spouse" | "child" | "mother";
  /** The share, or undefined when a lawyer has to set it. */
  share?: Fraction;
  /** Key under heirs.why, with the values that message needs. */
  whyKey: string;
  whyValues?: Record<string, string | number>;
};

export type HeirResult = {
  /*
    What kind of answer this is:
      "will"       — there is a will, so nothing is calculated
      "shares"     — the app can name heirs AND their shares
      "names-only" — likely heirs can be named, but NOT their shares
      "nothing"    — not enough is known about the family yet
  */
  kind: "will" | "shares" | "names-only" | "nothing";
  /** Key under law.acts: the law this result is based on. */
  lawKey: ActKey;
  /** Key under heirs.summary, with the values that message needs. */
  summaryKey: string;
  summaryValues?: Record<string, string | number>;
  heirs: HeirShare[];
  /** Always false. Only a lawyer's sign-off can change this. */
  lawyerVerified: false;
  /** Key under heirs.caution: an extra warning worth showing. */
  cautionKey?: string;
};

/* ------------------------------------------------------------------ */
/*  Which law applies                                                 */
/* ------------------------------------------------------------------ */

export type ActKey = "notKnown" | "toBeConfirmed" | "will" | "hindu" | "indian" | "muslim";

/*
  The Hindu Succession Act covers Hindus, Sikhs, Buddhists and Jains.
  That is the Act's own definition, not a statement about these being
  one faith.
*/
const HINDU_SUCCESSION = ["hindu", "sikh", "buddhist", "jain"];

/* The Indian Succession Act covers Christians, Parsis and others. */
const INDIAN_SUCCESSION = ["christian", "parsi", "other"];

/*
  Which law applies, on its own — before anything is known about the
  family. calculateHeirs() below needs names and relationships before
  it can say anything; this needs only the one answer.

  It exists so that somebody who has chosen a faith and nothing else
  still gets a real answer rather than "tell us more". Both share the
  lists above, so they can never disagree about which Act applies.
*/
export type ApplicableLaw = {
  /** Key under law.acts. */
  actKey: ActKey;
  /** Key under law.notes. */
  noteKey: string;
};

export function lawForReligion(religion?: string | null): ApplicableLaw {
  const key = (religion ?? "").trim().toLowerCase();

  if (!key) return { actKey: "notKnown", noteKey: "notKnown" };
  if (key === "muslim") return { actKey: "muslim", noteKey: "muslim" };
  if (HINDU_SUCCESSION.includes(key)) return { actKey: "hindu", noteKey: "hindu" };
  if (INDIAN_SUCCESSION.includes(key)) return { actKey: "indian", noteKey: "indian" };

  // "private", and anything a future list might add.
  return { actKey: "toBeConfirmed", noteKey: key === "private" ? "private" : "other" };
}

/* ------------------------------------------------------------------ */
/*  The calculation                                                   */
/* ------------------------------------------------------------------ */

export function calculateHeirs(input: HeirInput): HeirResult {
  const family = readFamily(input);
  const religion = (input.religion ?? "").toLowerCase();

  // 1. A will overrides all of this. Nothing is computed.
  if (input.has_will === true) {
    return {
      kind: "will",
      lawKey: "will",
      summaryKey: "will",
      heirs: [],
      lawyerVerified: false,
      cautionKey: "will",
    };
  }

  // 2. Nothing useful can be said without knowing the family.
  if (family.length === 0) {
    return {
      kind: "nothing",
      lawKey: "notKnown",
      summaryKey: "nothing",
      heirs: [],
      lawyerVerified: false,
    };
  }

  // 3. Muslim personal law — named heirs, but never invented shares.
  if (religion === "muslim") {
    return {
      kind: "names-only",
      lawKey: "muslim",
      summaryKey: "muslim",
      heirs: family.map((person) => ({ ...person, whyKey: "muslim" })),
      lawyerVerified: false,
      cautionKey: "muslim",
    };
  }

  // 4. Faith not given — name the closest family, no shares.
  if (!HINDU_SUCCESSION.includes(religion) && !INDIAN_SUCCESSION.includes(religion)) {
    return {
      kind: "names-only",
      lawKey: "toBeConfirmed",
      summaryKey: religion === "private" ? "privateFaith" : "unknownFaith",
      heirs: family.map((person) => ({ ...person, whyKey: "closest" })),
      lawyerVerified: false,
      cautionKey: "confirmLaw",
    };
  }

  // 5. Hindu Succession Act — a surviving spouse, each child, and a
  //    living mother all take one equal share.
  if (HINDU_SUCCESSION.includes(religion)) {
    const count = family.length;
    const share = reduce({ top: 1, bottom: count });

    return {
      kind: "shares",
      lawKey: "hindu",
      summaryKey: "hinduShares",
      summaryValues: { count, top: share.top, bottom: share.bottom },
      heirs: family.map((person) => ({
        ...person,
        share,
        whyKey: equalShareWhyKey(person.relationKey),
      })),
      lawyerVerified: false,
      cautionKey: willCautionKey(input.has_will),
    };
  }

  // 6. Indian Succession Act — the spouse's third, the children's two
  //    thirds.
  return indianSuccession(family, input.has_will);
}

/* ------------------------------------------------------------------ */

function indianSuccession(family: HeirShare[], hasWill?: boolean | null): HeirResult {
  const spouse = family.find((person) => person.relationKey === "spouse");
  const children = family.filter((person) => person.relationKey === "child");
  const cautionKey = willCautionKey(hasWill);

  // Spouse and children: a third to the spouse, two thirds shared.
  if (spouse && children.length > 0) {
    const spouseShare: Fraction = { top: 1, bottom: 3 };
    // Two thirds split between the children: 2/(3 x number of children).
    const childShare = reduce({ top: 2, bottom: 3 * children.length });

    return {
      kind: "shares",
      lawKey: "indian",
      summaryKey: "indianSpouseAndChildren",
      heirs: [
        { ...spouse, share: spouseShare, whyKey: "spouseThird" },
        ...children.map((child) => ({
          ...child,
          share: childShare,
          whyKey: children.length === 1 ? "onlyChildTwoThirds" : "childrenShareTwoThirds",
          whyValues:
            children.length === 1
              ? undefined
              : { count: children.length, top: childShare.top, bottom: childShare.bottom },
        })),
      ],
      lawyerVerified: false,
      cautionKey,
    };
  }

  // A spouse and no children: everything goes to the spouse.
  if (spouse && children.length === 0) {
    const others = family.filter((person) => person !== spouse);

    if (others.length > 0) {
      return {
        kind: "names-only",
        lawKey: "indian",
        summaryKey: "indianSpouseAndOthers",
        heirs: family.map((person) => ({ ...person, whyKey: "possible" })),
        lawyerVerified: false,
        cautionKey,
      };
    }

    return {
      kind: "shares",
      lawKey: "indian",
      summaryKey: "indianSpouseOnly",
      heirs: [{ ...spouse, share: { top: 1, bottom: 1 }, whyKey: "spouseEverything" }],
      lawyerVerified: false,
      cautionKey,
    };
  }

  // Children and no spouse: shared equally between them.
  if (children.length > 0) {
    const share = reduce({ top: 1, bottom: children.length });
    const only = children.length === 1;

    return {
      kind: "shares",
      lawKey: "indian",
      summaryKey: only ? "indianOnlyChild" : "indianChildren",
      heirs: children.map((child) => ({
        ...child,
        share,
        whyKey: only ? "onlyChildEverything" : "childrenEqual",
      })),
      lawyerVerified: false,
      cautionKey,
    };
  }

  // Neither spouse nor children — only a parent was named.
  return {
    kind: "names-only",
    lawKey: "indian",
    summaryKey: "indianOther",
    heirs: family.map((person) => ({ ...person, whyKey: "possible" })),
    lawyerVerified: false,
    cautionKey,
  };
}

/* ------------------------------------------------------------------ */
/*  Reading the family out of the answers                             */
/* ------------------------------------------------------------------ */

function readFamily(input: HeirInput): HeirShare[] {
  const family: HeirShare[] = [];

  const spouse = (input.spouse_name ?? "").trim();
  if (spouse) {
    family.push({ name: spouse, relationKey: "spouse", whyKey: "" });
  }

  for (const child of splitNames(input.children_names)) {
    family.push({ name: child, relationKey: "child", whyKey: "" });
  }

  /*
    Only a mother the app was actually told is living. "Not sure"
    (null) is not a yes, so the mother is left off rather than assumed
    in.

    The name is left empty when it was not given. The screen fills in
    a translated stand-in, because "Their mother" cannot be assembled
    here any more.
  */
  if (input.mother_living === true) {
    family.push({ name: (input.mother_name ?? "").trim(), relationKey: "mother", whyKey: "" });
  }

  return family;
}

/** "Arjun\nMeera" or "Arjun, Meera" becomes ["Arjun", "Meera"] */
function splitNames(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function equalShareWhyKey(relation: HeirShare["relationKey"]): string {
  if (relation === "spouse") return "equalSpouse";
  if (relation === "child") return "equalChild";
  if (relation === "mother") return "equalMother";
  return "equalOther";
}

/** Shown when the family was not sure whether a will exists. */
function willCautionKey(hasWill?: boolean | null): string | undefined {
  return hasWill === null || hasWill === undefined ? "unknownWill" : undefined;
}

/* ------------------------------------------------------------------ */
/*  Fractions                                                         */
/* ------------------------------------------------------------------ */

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/** 2/6 becomes 1/3, so a share is always in its simplest form. */
export function reduce(fraction: Fraction): Fraction {
  if (fraction.bottom <= 0) return fraction;

  const divisor = greatestCommonDivisor(fraction.top, fraction.bottom) || 1;
  return { top: fraction.top / divisor, bottom: fraction.bottom / divisor };
}
