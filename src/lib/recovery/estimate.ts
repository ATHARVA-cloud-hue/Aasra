import {
  DEFAULT_EPF_CORPUS_RANGE,
  EDLI_BONUS_CAP,
  EDLI_MAXIMUM,
  EDLI_MINIMUM,
  EDLI_WAGE_MULTIPLE,
  EPF_EMPLOYEE_RATE,
  EPF_EMPLOYER_RATE,
  EPF_WAGE_CEILING_HISTORIC,
  GRATUITY_DAYS_PER_MONTH,
  GRATUITY_DAYS_PER_YEAR,
  GRATUITY_MAXIMUM,
  POINT_ESTIMATE_BAND,
  RBI_UNCLAIMED_DEPOSITS_CRORE,
  UNCLAIMED_DEPOSIT_YEARS,
  IEPF_TRANSFER_YEARS,
} from "@/lib/recovery/constants";

/*
  THE RECOVERY ESTIMATE.

  ====================================================================
  WHAT THIS IS, AND WHAT IT IS NOT
  ====================================================================
  This takes what a family has entered and works out a RANGE for what
  might be recoverable. It is an estimate built from statutory formulas
  and from figures the family typed in themselves.

  It is not, and cannot be, a balance. No public API returns a named
  individual's bank balance, insurance policy or land holding, and this
  file never pretends to have fetched one. Where a category cannot
  honestly be given a number, it is returned as "flag-only": counted as
  zero, shown on screen as worth checking, and pointed at the official
  portal where the family can search for themselves.

  ====================================================================
  FOUR RULES
  ====================================================================
  1. EVERY NUMBER CARRIES ITS BASIS. Each line item returns a `basis`
     string saying in plain words how it was derived, a `confidence`
     tag, and where available the official source. A family, or a
     judge, must be able to read the arithmetic back.

  2. DETERMINISTIC. No randomness, no clocks, no network. The same
     inputs always return the same numbers, which is what makes the
     "how is this calculated" panel truthful rather than decorative.

  3. CONSERVATIVE. Where a choice exists, the lower reading is taken.
     Reported amounts are counted at face value and never inflated.
     Nothing is counted twice.

  4. NEVER EMPTY. A family who has entered almost nothing still gets
     the flagged categories and the national context, because a blank
     screen reads as "there is nothing here", which is usually false.

  It is a pure function with no imports beyond the constants, so it can
  be checked by hand.
*/

/* ------------------------------------------------------------------ */
/*  Inputs                                                            */
/* ------------------------------------------------------------------ */

/** Just the parts of a CaseRecord this calculation reads. */
export type EstimateCase = {
  date_of_death?: string | null;
  place_of_death?: string | null;
  owned_business?: boolean | null;
  known_assets_note?: string | null;
  /** From the optional questions. */
  employed_at_death?: boolean | null;
  years_of_service?: number | null;
  last_monthly_salary?: number | null;
  birth_year?: number | null;
  property_state?: string | null;
};

/** Just the parts of an AssetRow this calculation reads. */
export type EstimateAsset = {
  asset_type?: string | null;
  details?: string | null;
  institution?: string | null;
};

export type Confidence = "reported" | "statutory" | "estimated" | "flag-only";

export type LineItem = {
  /** Key under recovery.categories, never a label. */
  categoryKey: string;
  low: number;
  high: number;
  /*
    Key under recovery.basis plus the values it needs. The wording
    lives in the dictionaries so the explanation reads correctly in
    every language the app offers.
  */
  basisKey: string;
  basisValues?: Record<string, string | number>;
  confidence: Confidence;
  sourceUrl?: string;
  sourceName?: string;
  /** Which registry in src/lib/registries.ts to pursue this through. */
  actionPortal?: string;
};

export type RecoveryEstimate = {
  headline: { low: number; high: number; mid: number; currency: "INR" };
  lineItems: LineItem[];
  /** Keys under recovery.assumptions, with any values they need. */
  assumptions: { key: string; values?: Record<string, string | number> }[];
  notes: { key: string; values?: Record<string, string | number> }[];
  /** True when nothing could be counted, so the page can adjust its framing. */
  nothingCounted: boolean;
  /** The national context strip. Never added into the headline. */
  context: {
    unclaimedDepositsCrore: number;
    unclaimedDepositsSourceUrl: string;
    unclaimedDepositsAsOn: string;
    unclaimedYears: number;
    iepfYears: number;
    iepfSourceUrl: string;
  };
};

/* ------------------------------------------------------------------ */
/*  Reading rupee amounts out of what the family typed                */
/* ------------------------------------------------------------------ */

/*
  Families write amounts the way people actually write them:
  "SBI savings about 2.5 lakh", "₹42,000", "LIC policy 1.5L",
  "2 crore of land", "Rs 85000".

  This finds those and returns them in rupees. It is deliberately
  strict about what counts as an amount, because over-reading is the
  dangerous direction: inventing ₹50,00,000 out of a policy number
  would put a figure in front of a grieving family that nobody can
  stand behind.

  So:
  - A number followed by lakh/lakhs/lac/L, or crore/cr, is scaled.
  - A number preceded by ₹ or Rs is taken as rupees.
  - A bare number is taken ONLY when it is at least four digits and
    is not part of a longer identifier. Policy and account numbers
    are the main false positive, so any run of digits longer than
    eight, or one attached to letters, is ignored.
*/

/** One amount found in free text, with the words it was read from. */
export type ParsedAmount = { rupees: number; text: string };

const LAKH = 100000;
const CRORE = 10000000;

/*
  Numbers that are obviously identifiers rather than money. A UAN is
  twelve digits, a policy number often eight or nine, an IFSC has
  letters in it. Anything that long is not read as an amount.
*/
const MAX_BARE_DIGITS = 8;

export function parseAmounts(text: string | null | undefined): ParsedAmount[] {
  if (!text) return [];

  const found: ParsedAmount[] = [];

  /*
    Scaled amounts first: "2.5 lakh", "₹1.5L", "3 crore", "2cr".
    Matched before plain numbers so the digits are not then re-read
    as rupees by the second pass.
  */
  const scaled = /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|l|crores?|cr)\b/gi;

  const consumed: [number, number][] = [];

  for (const match of text.matchAll(scaled)) {
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const unit = match[2].toLowerCase();
    const multiplier = unit.startsWith("c") ? CRORE : LAKH;

    found.push({ rupees: Math.round(amount * multiplier), text: match[0].trim() });
    consumed.push([match.index, match.index + match[0].length]);
  }

  /*
    Then amounts written out in full. A ₹ or Rs prefix is proof of
    intent, so those are accepted at any length. A bare number has to
    earn it: four to eight digits, with no letter stuck to either end.
  */
  const plain = /(₹|rs\.?|inr)?\s*(\d[\d,]{2,})(?![\d,]*\s*(?:lakhs?|lacs?|l\b|crores?|cr\b))/gi;

  for (const match of text.matchAll(plain)) {
    /*
      Anchor on the digits, not on the whole match.

      The pattern allows optional whitespace before the number, so
      match.index can land on that space rather than on the first
      digit. Reading the character "before the match" would then see
      the last letter of the previous word, and every amount written
      as "about 85000" would be thrown away as an identifier.
    */
    const digitsStart = match.index + match[0].indexOf(match[2]);
    const digitsEnd = digitsStart + match[2].length;

    // Skip anything already read as a lakh/crore amount.
    if (consumed.some(([from, to]) => digitsStart >= from && digitsStart < to)) continue;

    const digits = match[2].replace(/,/g, "");
    if (!/^\d+$/.test(digits)) continue;

    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const prefixed = Boolean(match[1]);

    // A bare number must look like money, not like an identifier.
    if (!prefixed) {
      if (digits.length < 4 || digits.length > MAX_BARE_DIGITS) continue;

      /*
        A bare four-digit number in this range is almost always a
        year. Families write "an LIC policy taken around 2005" and
        "shares bought in 1990" constantly, and reading those as
        ₹2,005 and ₹1,990 would put invented money in the estimate.

        Rejecting them costs nothing: a genuine balance of ₹1,990
        would not change a range quoted in lakhs. A ₹ or Rs prefix
        still overrides this, because that is explicit intent.
      */
      if (digits.length === 4 && amount >= 1900 && amount <= 2100) continue;

      // Attached to a letter or a slash? It is a reference, not money.
      const before = text[digitsStart - 1] ?? " ";
      const after = text[digitsEnd] ?? " ";
      if (/[A-Za-z/]/.test(before) || /[A-Za-z/]/.test(after)) continue;
    }

    found.push({ rupees: amount, text: match[0].trim() });
  }

  return found;
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

/** Was the deceased person in employment at death, as far as we know? */
function wasEmployed(input: EstimateCase, assets: EstimateAsset[]): boolean {
  // An explicit answer to the optional question wins over any guess.
  if (input.employed_at_death === true) return true;
  if (input.employed_at_death === false) return false;

  // Running a business is not employment, so EDLI and gratuity do not
  // follow from it. Said once here rather than in each category.
  if (input.owned_business === true) return false;

  // Otherwise look for an employer or an EPF reference in what was
  // entered. "worked at", "UAN", "EPF" and "EPFO" are what families
  // actually write.
  const haystack = [
    input.known_assets_note ?? "",
    ...assets.map((asset) => `${asset.asset_type ?? ""} ${asset.institution ?? ""} ${asset.details ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  return /\b(uan|epf|epfo|provident|employer|employed|worked at|working at|salary|pension)\b/.test(haystack);
}

/*
  There was a mentionsBank() helper here. It is gone because the
  unclaimed-deposit flag is now shown unconditionally: a forgotten
  account is by definition one nobody remembers to mention, so making
  the search conditional on mentioning a bank hid it from the families
  who most needed it.
*/

/** Any sign of shares, demat or mutual funds. */
function mentionsShares(input: EstimateCase, assets: EstimateAsset[]): boolean {
  const haystack = [
    input.known_assets_note ?? "",
    ...assets.map((asset) => `${asset.asset_type ?? ""} ${asset.institution ?? ""} ${asset.details ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  return /\b(share|shares|demat|folio|dividend|mutual fund|equity|stock|nsdl|cdsl)\b/.test(haystack);
}

/** Any sign of an insurance policy. */
function mentionsInsurance(input: EstimateCase, assets: EstimateAsset[]): boolean {
  const haystack = [
    input.known_assets_note ?? "",
    ...assets.map((asset) => `${asset.asset_type ?? ""} ${asset.institution ?? ""} ${asset.details ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  return /\b(insurance|policy|lic|assured|sum assured|term plan|endowment)\b/.test(haystack);
}

/** Any sign of property or land. */
function mentionsProperty(input: EstimateCase, assets: EstimateAsset[]): boolean {
  const haystack = [
    input.known_assets_note ?? "",
    ...assets.map((asset) => `${asset.asset_type ?? ""} ${asset.institution ?? ""} ${asset.details ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();

  return /\b(land|property|plot|flat|house|7\/12|survey number|khata|patta|jamabandi|acre|guntha)\b/.test(haystack);
}

/*
  Roughly how old the deceased person was. Used only to decide whether
  a paper share certificate is plausible enough to be worth flagging.
  Never shown as a fact, and never used to produce a rupee figure.

  NOTE: birth_year is supported but is NOT currently collected by any
  intake question, so in practice this returns null and the age-based
  share flag does not fire. That is deliberate rather than broken: the
  alternative was asking a bereaved family for a date of birth to
  sharpen a flag that carries no rupee figure anyway. The share flag
  still fires on any mention of shares, a demat account, a folio or a
  dividend, which is the reliable signal. Add a birth-year question
  and this starts working with no other change.
*/
function approximateAgeAtDeath(input: EstimateCase): number | null {
  if (!input.birth_year) return null;

  const deathYear = Number((input.date_of_death ?? "").slice(0, 4));
  if (!Number.isFinite(deathYear) || deathYear < 1900) return null;

  const age = deathYear - input.birth_year;
  return age > 0 && age < 130 ? age : null;
}

/** The year of death, when it can be read. */
function yearOfDeath(input: EstimateCase): number | null {
  const year = Number((input.date_of_death ?? "").slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function rupees(value: number): number {
  // Whole rupees only. Paise in an estimate is false precision.
  return Math.max(0, Math.round(value));
}

/* ------------------------------------------------------------------ */
/*  The calculation                                                   */
/* ------------------------------------------------------------------ */

export function estimateRecovery(
  input: EstimateCase,
  assets: EstimateAsset[] = [],
): RecoveryEstimate {
  const lineItems: LineItem[] = [];
  const assumptions: RecoveryEstimate["assumptions"] = [];
  const notes: RecoveryEstimate["notes"] = [];

  const employed = wasEmployed(input, assets);
  const salary = input.last_monthly_salary && input.last_monthly_salary > 0 ? input.last_monthly_salary : null;
  const years = input.years_of_service && input.years_of_service > 0 ? input.years_of_service : null;

  /* ---------------------------------------------------------------- */
  /*  1. Amounts the family reported. Counted at face value.          */
  /* ---------------------------------------------------------------- */

  /*
    Read from the free-text answer and from every asset's details.
    Counted once each: the same string is not parsed twice, and the
    low and the high are identical because a figure somebody typed is
    not a range.
  */
  const reported: ParsedAmount[] = [
    ...parseAmounts(input.known_assets_note),
    ...assets.flatMap((asset) => parseAmounts(asset.details)),
  ];

  const reportedTotal = reported.reduce((sum, amount) => sum + amount.rupees, 0);

  if (reportedTotal > 0) {
    lineItems.push({
      categoryKey: "reportedDeposits",
      low: rupees(reportedTotal),
      high: rupees(reportedTotal),
      basisKey: "reportedDeposits",
      basisValues: {
        count: reported.length,
        amounts: reported.map((amount) => amount.text).join(", "),
      },
      confidence: "reported",
    });

    assumptions.push({ key: "reportedAtFaceValue" });
  }

  /* ---------------------------------------------------------------- */
  /*  2. EDLI death insurance. Statutory, and often unknown.          */
  /* ---------------------------------------------------------------- */

  if (employed) {
    /*
      The floor is statutory, so the low end is firm. The high end is
      the statutory ceiling, which is reached when 35 x wages plus the
      balance-linked part gets there. Where a salary is known, the
      wage-linked calculation can be shown instead of just the cap,
      which makes the number far more credible.
    */
    let edliHigh = EDLI_MAXIMUM.value;
    let basisKey = "edliRange";
    let basisValues: Record<string, string | number> = {
      min: formatRupees(EDLI_MINIMUM.value),
      max: formatRupees(EDLI_MAXIMUM.value),
    };

    if (salary) {
      const cappedWages = Math.min(salary, EPF_WAGE_CEILING_HISTORIC.value);
      const wageLinked = EDLI_WAGE_MULTIPLE.value * cappedWages + EDLI_BONUS_CAP.value;

      edliHigh = Math.min(EDLI_MAXIMUM.value, Math.max(EDLI_MINIMUM.value, wageLinked));

      basisKey = "edliFromSalary";
      basisValues = {
        multiple: EDLI_WAGE_MULTIPLE.value,
        cappedWages: formatRupees(cappedWages),
        ceiling: formatRupees(EPF_WAGE_CEILING_HISTORIC.value),
        bonusCap: formatRupees(EDLI_BONUS_CAP.value),
        min: formatRupees(EDLI_MINIMUM.value),
        max: formatRupees(EDLI_MAXIMUM.value),
      };
    }

    lineItems.push({
      categoryKey: "edli",
      low: rupees(EDLI_MINIMUM.value),
      high: rupees(edliHigh),
      basisKey,
      basisValues,
      confidence: "statutory",
      sourceUrl: EDLI_MAXIMUM.sourceUrl,
      sourceName: EDLI_MAXIMUM.sourceName,
      actionPortal: "epfo",
    });

    assumptions.push({ key: "edliRequiresMembership" });
  }

  /* ---------------------------------------------------------------- */
  /*  3. EPF and EPS corpus.                                          */
  /* ---------------------------------------------------------------- */

  if (employed) {
    if (salary && years) {
      /*
        Contributions only, with no interest added. Interest would
        raise the figure considerably, and leaving it out is the
        conservative choice: a family told the lower number and then
        paid more is pleased, the reverse is not.

        THE TWO ENDS BRACKET TWO REAL PRACTICES, which is why the
        range is wide rather than tidy.

        Contribution is mandatory only on wages up to the EPF ceiling.
        An employer may contribute on the full salary instead, and many
        in the organised sector do, but it is not required. So:

          low  = the employee's 12% of the CEILING, the legal minimum
          high = employee plus employer, 24%, of the FULL salary

        Taking the full salary at both ends would roughly double the
        bottom of this range for anyone earning above the ceiling,
        which is the opposite of conservative. This line is usually
        the largest in the whole estimate, so getting its floor right
        matters more here than anywhere else.
      */
      const monthsWorked = years * 12;
      const ceiling = EPF_WAGE_CEILING_HISTORIC.value;
      const cappedWages = Math.min(salary, ceiling);

      const statutoryMinimum = cappedWages * EPF_EMPLOYEE_RATE.value * monthsWorked;
      const bothSidesFullSalary =
        salary * (EPF_EMPLOYEE_RATE.value + EPF_EMPLOYER_RATE.value) * monthsWorked;

      lineItems.push({
        categoryKey: "epf",
        low: rupees(statutoryMinimum),
        high: rupees(bothSidesFullSalary),
        basisKey: "epfFromSalaryAndYears",
        basisValues: {
          salary: formatRupees(salary),
          years,
          ceiling: formatRupees(ceiling),
          employeeRate: Math.round(EPF_EMPLOYEE_RATE.value * 100),
          totalRate: Math.round((EPF_EMPLOYEE_RATE.value + EPF_EMPLOYER_RATE.value) * 100),
        },
        confidence: "estimated",
        sourceUrl: EPF_EMPLOYEE_RATE.sourceUrl,
        sourceName: EPF_EMPLOYEE_RATE.sourceName,
        actionPortal: "epfo",
      });

      assumptions.push({ key: "epfNoInterest" });
      assumptions.push({ key: "epfCeilingBrackets" });
    } else {
      /*
        Employment is known but nothing to calculate from. A wide,
        clearly-labelled placeholder beats a zero, which a family
        would read as "there is no provident fund".
      */
      lineItems.push({
        categoryKey: "epf",
        low: rupees(DEFAULT_EPF_CORPUS_RANGE.low),
        high: rupees(DEFAULT_EPF_CORPUS_RANGE.high),
        basisKey: "epfDefaultRange",
        confidence: "estimated",
        actionPortal: "epfo",
      });

      assumptions.push({ key: "epfDefaultIsPlaceholder" });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  4. Gratuity and dues.                                           */
  /* ---------------------------------------------------------------- */

  /*
    The five-year rule is waived on death, so this is calculated
    whenever a salary and a length of service are known, however
    short the service. See the note in constants.ts.
  */
  if (employed && salary && years) {
    const point =
      (GRATUITY_DAYS_PER_YEAR.value / GRATUITY_DAYS_PER_MONTH.value) * salary * Math.floor(years);

    const capped = Math.min(point, GRATUITY_MAXIMUM.value);

    lineItems.push({
      categoryKey: "gratuity",
      low: rupees(capped * (1 - POINT_ESTIMATE_BAND)),
      high: rupees(Math.min(capped * (1 + POINT_ESTIMATE_BAND), GRATUITY_MAXIMUM.value)),
      basisKey: "gratuityFormula",
      basisValues: {
        days: GRATUITY_DAYS_PER_YEAR.value,
        divisor: GRATUITY_DAYS_PER_MONTH.value,
        salary: formatRupees(salary),
        years: Math.floor(years),
        point: formatRupees(capped),
        band: Math.round(POINT_ESTIMATE_BAND * 100),
        max: formatRupees(GRATUITY_MAXIMUM.value),
      },
      confidence: "statutory",
      sourceUrl: GRATUITY_MAXIMUM.sourceUrl,
      sourceName: GRATUITY_MAXIMUM.sourceName,
    });

    assumptions.push({ key: "gratuityDeathWaiver" });
    assumptions.push({ key: "gratuityOnBasicWages" });
  } else if (employed) {
    notes.push({ key: "gratuityNeedsSalary" });
  }

  /* ---------------------------------------------------------------- */
  /*  5. Unclaimed bank deposits. Flagged, never estimated.           */
  /* ---------------------------------------------------------------- */

  /*
    There is no way to know whether a particular person has money in
    the DEA Fund without searching UDGAM as that person's family. So
    this is worth ₹0 in the headline and is on the page as a job to
    do, with the national total as the reason to do it.

    THIS ONE IS ALWAYS SHOWN, unlike the other flags. Three reasons:
    the search is free, it covers every bank in India at once, and a
    forgotten account is by definition one nobody remembers to
    mention. Waiting for the family to name a bank would hide the
    search from exactly the families who most need it.

    It also means this page is never completely empty, however little
    has been entered. An empty screen would read as "there is nothing
    to find", which for most families is simply untrue.
  */
  const age = approximateAgeAtDeath(input);

  lineItems.push({
    categoryKey: "unclaimedDeposits",
    low: 0,
    high: 0,
    basisKey: "unclaimedDepositsFlag",
    basisValues: {
      years: UNCLAIMED_DEPOSIT_YEARS.value,
      crore: RBI_UNCLAIMED_DEPOSITS_CRORE.value.toLocaleString("en-IN"),
    },
    confidence: "flag-only",
    sourceUrl: RBI_UNCLAIMED_DEPOSITS_CRORE.sourceUrl,
    sourceName: RBI_UNCLAIMED_DEPOSITS_CRORE.sourceName,
    actionPortal: "udgam",
  });

  /* ---------------------------------------------------------------- */
  /*  6. Shares and dividends. Flagged, never estimated.              */
  /* ---------------------------------------------------------------- */

  /*
    Flagged on any hint of share investing, or where the deceased
    person was an adult before about 2010, when paper certificates and
    physical folios were still ordinary. Those are the holdings that
    go unclaimed, because nothing arrives in the post to remind
    anybody they exist.
  */
  const deathYear = yearOfDeath(input);
  const adultBefore2010 =
    age !== null && deathYear !== null ? deathYear - age + 18 <= 2010 : false;

  if (mentionsShares(input, assets) || adultBefore2010) {
    lineItems.push({
      categoryKey: "shares",
      low: 0,
      high: 0,
      basisKey: "sharesFlag",
      basisValues: { years: IEPF_TRANSFER_YEARS.value },
      confidence: "flag-only",
      sourceUrl: IEPF_TRANSFER_YEARS.sourceUrl,
      sourceName: IEPF_TRANSFER_YEARS.sourceName,
      actionPortal: "iepf",
    });
  }

  /* ---------------------------------------------------------------- */
  /*  7. Life insurance. Counted only if a figure was given.          */
  /* ---------------------------------------------------------------- */

  /*
    A policy number is not a sum assured. If the family entered an
    amount it has already been counted under "reported" above, so
    this line is flag-only in every case and exists to route them to
    IRDAI to trace a policy they cannot find the paperwork for.
  */
  if (mentionsInsurance(input, assets)) {
    lineItems.push({
      categoryKey: "lifeInsurance",
      low: 0,
      high: 0,
      basisKey: "lifeInsuranceFlag",
      confidence: "flag-only",
      actionPortal: "irdai",
    });

    assumptions.push({ key: "insuranceNotDoubleCounted" });
  }

  /* ---------------------------------------------------------------- */
  /*  8. Property and land. Never given a rupee value.                */
  /* ---------------------------------------------------------------- */

  /*
    Deliberately not estimated. A plot's value depends on its exact
    location, its road frontage, its title and whether it is
    agricultural, and no honest number can be produced from a state
    name. The family is sent to the state's land record portal
    instead, and can record what they find as an asset.
  */
  if (mentionsProperty(input, assets) || input.property_state) {
    lineItems.push({
      categoryKey: "property",
      low: 0,
      high: 0,
      basisKey: "propertyFlag",
      confidence: "flag-only",
      actionPortal: "land",
    });

    assumptions.push({ key: "propertyNotValued" });
  }

  /* ---------------------------------------------------------------- */
  /*  The headline                                                    */
  /* ---------------------------------------------------------------- */

  const counted = lineItems.filter((item) => item.confidence !== "flag-only");

  const low = counted.reduce((sum, item) => sum + item.low, 0);
  const high = counted.reduce((sum, item) => sum + item.high, 0);

  // Said on every single result, without exception.
  assumptions.push({ key: "estimateNotBalance" });

  if (counted.length === 0) {
    notes.push({ key: "nothingCountedYet" });
  }

  return {
    headline: { low: rupees(low), high: rupees(high), mid: rupees((low + high) / 2), currency: "INR" },
    lineItems,
    assumptions,
    notes,
    nothingCounted: counted.length === 0,
    context: {
      unclaimedDepositsCrore: RBI_UNCLAIMED_DEPOSITS_CRORE.value,
      unclaimedDepositsSourceUrl: RBI_UNCLAIMED_DEPOSITS_CRORE.sourceUrl,
      unclaimedDepositsAsOn: "2024-03-31",
      unclaimedYears: UNCLAIMED_DEPOSIT_YEARS.value,
      iepfYears: IEPF_TRANSFER_YEARS.value,
      iepfSourceUrl: IEPF_TRANSFER_YEARS.sourceUrl,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Showing rupees the way people in India read them                  */
/* ------------------------------------------------------------------ */

/*
  "₹2,40,000" rather than "₹240,000". Indian digit grouping in every
  language the app offers, because that is what a reader in India
  expects whichever script the page is in.
*/
export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** "₹2,40,000 to ₹8,10,000", with one ₹ on each end. */
export function formatRange(low: number, high: number, separator = "–"): string {
  if (low === high) return formatRupees(low);
  return `${formatRupees(low)} ${separator} ${formatRupees(high)}`;
}
