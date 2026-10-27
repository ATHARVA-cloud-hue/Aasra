/*
  WHO INHERITS — a deliberately simple first pass.

  This file takes what a family told us and works out who the law is
  likely to treat as an heir, with a share and a plain-language reason.

  ------------------------------------------------------------------
  READ THIS BEFORE CHANGING ANYTHING HERE
  ------------------------------------------------------------------
  Indian succession law is genuinely complicated. It differs by faith,
  by whether there is a will, by whether property is ancestral, by
  which school of law a family follows, and by case law that moves.
  What is below is a SIMPLIFICATION, good enough to tell a family what
  to expect and what to ask about — and nothing more than that.

  Three rules this file holds to:

  1. Nothing here is ever marked verified. Every result carries
     lawyerVerified: false, and the screen shows that plainly. A
     lawyer checks it before anything is filed.

  2. Where the real calculation is beyond a simple rule — Muslim
     personal law especially — we do NOT invent fractions. We name the
     likely heirs and say plainly that a lawyer works out the shares.
     A confidently wrong fraction is far worse than an honest gap:
     a family might divide money on the strength of it.

  3. We never guess at a fact we were not told. No spouse named means
     no spouse in the result, not an assumed one.

  It is a pure function: give it the same answers and it returns the
  same result, with no database and no network. That makes it easy to
  check by hand, which matters for something this consequential.
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

export type HeirShare = {
  name: string;
  /** "Spouse", "Child", "Mother" — never guessed from a name. */
  relation: string;
  /** In plain words: "a third of the estate". Empty when not calculated. */
  share: string;
  /** Why this person is on the list. */
  why: string;
};

export type HeirResult = {
  /*
    What kind of answer this is:
      "will"       — there is a will, so we do not calculate at all
      "shares"     — we can name heirs AND their shares
      "names-only" — we can name likely heirs but NOT their shares
      "nothing"    — we do not know enough about the family yet
  */
  kind: "will" | "shares" | "names-only" | "nothing";
  /** The law this is based on, named plainly. */
  law: string;
  /** One or two calm sentences covering the whole result. */
  summary: string;
  heirs: HeirShare[];
  /** Always false. Only a lawyer's sign-off can change this. */
  lawyerVerified: false;
  /** An extra warning worth showing prominently, if any. */
  caution?: string;
};

/* ------------------------------------------------------------------ */
/*  Which law applies                                                 */
/* ------------------------------------------------------------------ */

/*
  The Hindu Succession Act covers Hindus, Sikhs, Buddhists and Jains.
  That is the Act's own definition, not a statement about these being
  one faith.
*/
const HINDU_SUCCESSION = ["hindu", "sikh", "buddhist", "jain"];

/* The Indian Succession Act covers Christians, Parsis and others. */
const INDIAN_SUCCESSION = ["christian", "parsi", "other"];

/* ------------------------------------------------------------------ */
/*  The calculation                                                   */
/* ------------------------------------------------------------------ */

export function calculateHeirs(input: HeirInput): HeirResult {
  const family = readFamily(input);
  const religion = (input.religion ?? "").toLowerCase();

  // 1. A will overrides all of this. We do not compute anything.
  if (input.has_will === true) {
    return {
      kind: "will",
      law: "The will itself",
      summary:
        "Because there is a will, it decides who inherits — not the general law. Our job now is different: " +
        "we help you show the will is genuine, and get it accepted by the banks and offices that will ask for it.",
      heirs: [],
      lawyerVerified: false,
      caution:
        "A will still has to be proved before it is acted on, and parts of one can be challenged. " +
        "Bring it to us and a lawyer will read it with you.",
    };
  }

  // 2. We cannot say anything useful without knowing the family.
  if (family.length === 0) {
    return {
      kind: "nothing",
      law: "Not yet known",
      summary:
        "Tell us about a spouse, children, or whether their mother is living, and we can show who the law " +
        "treats as an heir.",
      heirs: [],
      lawyerVerified: false,
    };
  }

  // 3. Muslim personal law — named heirs, but never invented shares.
  if (religion === "muslim") {
    return {
      kind: "names-only",
      law: "Muslim personal law (the Shariat Application Act, 1937)",
      summary:
        "These are the people most likely to be heirs. We have deliberately not put a share next to each name: " +
        "under Muslim personal law the exact fractions depend on which relatives survive and which school of " +
        "law your family follows, and getting that wrong would be worse than leaving it open.",
      heirs: family.map((person) => ({
        ...person,
        share: "",
        why: `${person.relation} of the person who died, and so an heir under Muslim personal law.`,
      })),
      lawyerVerified: false,
      caution:
        "A lawyer who practises in this area works out each exact share. Please do not divide anything " +
        "between yourselves on the strength of this page alone.",
    };
  }

  // 4. Faith not given — name the closest family, no shares.
  if (!HINDU_SUCCESSION.includes(religion) && !INDIAN_SUCCESSION.includes(religion)) {
    return {
      kind: "names-only",
      law: "To be confirmed",
      summary:
        religion === "private"
          ? "You chose not to tell us their faith, which is completely your right. These are the closest " +
            "family, who are heirs under every one of India's succession laws — but which law sets the exact " +
            "shares depends on that answer, so we have left the shares open."
          : "These are the closest family. Once we know which law applies to your family, we can show each " +
            "person's share.",
      heirs: family.map((person) => ({
        ...person,
        share: "",
        why: `${person.relation} of the person who died, and among the closest family in law.`,
      })),
      lawyerVerified: false,
      caution: "A lawyer confirms which law applies and what each share is.",
    };
  }

  // 5. Hindu Succession Act — spouse, each child, and a living mother
  //    all take one equal share.
  if (HINDU_SUCCESSION.includes(religion)) {
    const count = family.length;
    const share = fractionWords(1, count);

    return {
      kind: "shares",
      law: "The Hindu Succession Act, 1956",
      summary:
        `With no will, the estate is divided equally between the closest family — here that is ` +
        `${count === 1 ? "one person" : `${numberWord(count)} people`}, so each takes ${share}.`,
      heirs: family.map((person) => ({
        ...person,
        share,
        why: equalShareReason(person.relation),
      })),
      lawyerVerified: false,
      caution: willCaution(input.has_will),
    };
  }

  // 6. Indian Succession Act — the spouse's third, children's two thirds.
  return indianSuccession(family, input.has_will);
}

/* ------------------------------------------------------------------ */

function indianSuccession(family: HeirShare[], hasWill?: boolean | null): HeirResult {
  const law = "The Indian Succession Act, 1925";
  const spouse = family.find((person) => person.relation === "Spouse");
  const children = family.filter((person) => person.relation === "Child");
  const caution = willCaution(hasWill);

  // Spouse and children: a third to the spouse, two thirds shared.
  if (spouse && children.length > 0) {
    const spouseShare = fractionWords(1, 3);
    // Two thirds split between the children: 2/(3 × number of children).
    const childShare = fractionWords(2, 3 * children.length);

    return {
      kind: "shares",
      law,
      summary:
        `With no will, the surviving spouse takes ${spouseShare} and the children share the rest equally ` +
        `between them.`,
      heirs: [
        { ...spouse, share: spouseShare, why: `The surviving spouse takes a third of the estate under ${law}.` },
        ...children.map((child) => ({
          ...child,
          share: childShare,
          why:
            children.length === 1
              ? `The only child takes the remaining two thirds.`
              : `The children share the remaining two thirds equally — ${numberWord(children.length)} of them, ` +
                `so ${childShare} each.`,
        })),
      ],
      lawyerVerified: false,
      caution,
    };
  }

  // A spouse and no children: everything goes to the spouse.
  if (spouse && children.length === 0) {
    const others = family.filter((person) => person !== spouse);

    return {
      kind: others.length > 0 ? "names-only" : "shares",
      law,
      summary:
        others.length > 0
          ? "With no will and no children, the surviving spouse inherits — but you have also told us about " +
            "another close relative, and where there is no child the Act's order between them depends on " +
            "exactly who survives. We have left the shares for a lawyer to set."
          : "With no will and no children, the whole estate goes to the surviving spouse.",
      heirs:
        others.length > 0
          ? family.map((person) => ({ ...person, share: "", why: `${person.relation}, and a possible heir under ${law}.` }))
          : [{ ...spouse, share: fractionWords(1, 1), why: `With no children, the spouse inherits everything under ${law}.` }],
      lawyerVerified: false,
      caution,
    };
  }

  // Children and no spouse: shared equally between them.
  if (children.length > 0) {
    const share = fractionWords(1, children.length);
    return {
      kind: "shares",
      law,
      summary:
        children.length === 1
          ? "With no will and no surviving spouse, the only child inherits the whole estate."
          : `With no will and no surviving spouse, the estate is shared equally between the children.`,
      heirs: children.map((child) => ({
        ...child,
        share,
        why:
          children.length === 1
            ? `The only child inherits everything under ${law}.`
            : `The children inherit in equal parts under ${law}.`,
      })),
      lawyerVerified: false,
      caution,
    };
  }

  // Neither spouse nor children — only a parent was mentioned.
  return {
    kind: "names-only",
    law,
    summary:
      "With no spouse and no children, the estate passes to the next closest relatives. The Act sets an order " +
      "for this that depends on exactly who survives, so we have left the shares for a lawyer to set.",
    heirs: family.map((person) => ({ ...person, share: "", why: `${person.relation}, and a possible heir under ${law}.` })),
    lawyerVerified: false,
    caution,
  };
}

/* ------------------------------------------------------------------ */
/*  Reading the family out of the answers                             */
/* ------------------------------------------------------------------ */

/*
  Note on wording: we say "Spouse" and "Child", never "Wife", "Son" or
  "Daughter". We were never told anyone's gender, and a name is not
  evidence of it. Getting that wrong on a page about someone's dead
  parent is not a small thing.
*/
function readFamily(input: HeirInput): HeirShare[] {
  const family: HeirShare[] = [];

  const spouse = (input.spouse_name ?? "").trim();
  if (spouse) {
    family.push({ name: spouse, relation: "Spouse", share: "", why: "" });
  }

  for (const child of splitNames(input.children_names)) {
    family.push({ name: child, relation: "Child", share: "", why: "" });
  }

  // Only a mother we were actually told is living. "Not sure" (null)
  // is not a yes, so she is left off rather than assumed in.
  if (input.mother_living === true) {
    const name = (input.mother_name ?? "").trim();
    family.push({ name: name || "Their mother", relation: "Mother", share: "", why: "" });
  }

  return family;
}

/** "Arjun\nMeera" or "Arjun, Meera" → ["Arjun", "Meera"] */
function splitNames(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function equalShareReason(relation: string): string {
  if (relation === "Spouse") return "A surviving spouse is a Class I heir, taking one equal share.";
  if (relation === "Child") return "Each child is a Class I heir, taking one equal share — sons and daughters alike.";
  if (relation === "Mother") return "A surviving mother is a Class I heir, taking one equal share.";
  return "A Class I heir, taking one equal share.";
}

/** Shown when the family was not sure whether a will exists. */
function willCaution(hasWill?: boolean | null): string | undefined {
  if (hasWill === null || hasWill === undefined) {
    return (
      "You were not sure whether there is a will. If one turns up, it replaces everything on this page — " +
      "so it is worth looking before anything is filed."
    );
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Fractions, in words a grieving family can read                    */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

const DENOMINATOR_WORDS = [
  "",
  "whole",
  "half",
  "third",
  "quarter",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];

export function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

/*
  Turns 1/3 into "a third of the estate" and 2/9 into "two ninths of
  the estate". Falls back to plain digits for anything unusual, which
  is still correct — just less gentle to read.
*/
export function fractionWords(numerator: number, denominator: number): string {
  if (denominator <= 0) return "";

  const divisor = greatestCommonDivisor(numerator, denominator);
  const top = numerator / divisor;
  const bottom = denominator / divisor;

  if (bottom === 1) return "the whole estate";

  // "half of the estate" — never "a half of the estate".
  if (bottom === 2 && top === 1) return "half of the estate";

  if (bottom >= DENOMINATOR_WORDS.length || top >= NUMBER_WORDS.length) {
    return `${top}/${bottom} of the estate`;
  }

  const name = DENOMINATOR_WORDS[bottom];

  if (top === 1) {
    // "an eighth", not "a eighth".
    const article = /^[aeiou]/.test(name) ? "an" : "a";
    return `${article} ${name} of the estate`;
  }

  return `${numberWord(top)} ${name}s of the estate`;
}
