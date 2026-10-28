/*
  THE NUMBERS THE ESTIMATE IS BUILT FROM.

  ====================================================================
  READ THIS BEFORE CHANGING ANY FIGURE HERE
  ====================================================================
  Every number below was checked against the official source named
  beside it on the date in `lastVerified`. Nothing in this file is an
  approximation somebody remembered, and nothing is a round number
  chosen because it looked plausible.

  Three rules this file holds to:

  1. A FIGURE WITHOUT A SOURCE DOES NOT GO IN. If an official total
     could not be found, the constant is left out and the screen says
     less. There is one example of that below: no verified national
     IEPF total was available, so the app states the rule (seven years,
     then transferred, still claimable) and shows no rupee figure.

  2. EVERY FIGURE CARRIES ITS AS-ON DATE. "Unclaimed deposits" is a
     moving number. Showing it without saying when it was measured
     would make the app look more certain than the data is.

  3. NOTHING HERE IS A PARTICULAR PERSON'S MONEY. These are statutory
     caps and national totals. No public API exists that can return a
     named individual's bank balance, policy or land holding, and this
     app never pretends otherwise. The national figures are context for
     why searching is worth the effort, and the statutory figures are
     ceilings on what a claim could come to.

  Re-verify anything whose lastVerified is more than a year old. The
  EDLI cap and the gratuity cap both move by notification.
*/

/** Where a figure came from, so the screen can show it. */
export type Sourced<T> = {
  value: T;
  /** The official page or PDF this was read from. */
  sourceUrl: string;
  /** Who publishes it, named as the family would recognise it. */
  sourceName: string;
  /** ISO date this was last checked against that source. */
  lastVerified: string;
  /** What the figure measures, and anything that qualifies it. */
  note: string;
};

/* ------------------------------------------------------------------ */
/*  EDLI — death insurance that comes automatically with EPF          */
/* ------------------------------------------------------------------ */

/*
  The Employees' Deposit Linked Insurance scheme pays out on death in
  service. The employee pays nothing towards it; the employer pays
  0.5% of wages. Families very often do not know it exists, which is
  exactly why it is in this app.

  The payout is the larger of two calculations, then held between a
  floor and a ceiling:

    (a) based on the average PF balance of the last 12 months, or
    (b) 35 x average monthly wages (wages counted up to the ceiling)
        + 50% of the average balance, that second part capped at
        ₹1,75,000

  then clamped to between ₹2,50,000 and ₹7,00,000.

  NOTE ON A CONTRADICTION IN EPFO'S OWN PAGES. The scheme page gives
  the maximum as ₹7,00,000, and 35 x ₹15,000 + ₹1,75,000 comes to
  exactly ₹7,00,000, so the figures are internally consistent. But
  EPFO's older FAQ page still says ₹6,00,000. The ₹7,00,000 ceiling
  came in by notification on 28 April 2021; the FAQ is stale. The
  app uses the scheme page.
*/
export const EDLI_MINIMUM: Sourced<number> = {
  value: 250000,
  sourceUrl: "https://pmvbry.epfindia.gov.in/insurance-scheme-edli/",
  sourceName: "EPFO, Employees' Deposit Linked Insurance Scheme",
  lastVerified: "2026-10-28",
  note:
    "The floor on the EDLI death-in-service payout. Applies where the deceased person was an EPF member in " +
    "employment at the time of death.",
};

export const EDLI_MAXIMUM: Sourced<number> = {
  value: 700000,
  sourceUrl: "https://pmvbry.epfindia.gov.in/insurance-scheme-edli/",
  sourceName: "EPFO, Employees' Deposit Linked Insurance Scheme",
  lastVerified: "2026-10-28",
  note:
    "The ceiling on the EDLI death-in-service payout, including the 20% enhancement. EPFO's older FAQ page " +
    "still shows the pre-2021 figure of ₹6,00,000.",
};

/*
  The wage multiplier and the balance-linked cap inside calculation
  (b) above. Kept separately so the basis shown on screen can name the
  actual arithmetic rather than just the answer.
*/
export const EDLI_WAGE_MULTIPLE: Sourced<number> = {
  value: 35,
  sourceUrl: "https://pmvbry.epfindia.gov.in/insurance-scheme-edli/",
  sourceName: "EPFO, Employees' Deposit Linked Insurance Scheme",
  lastVerified: "2026-10-28",
  note: "35 times average monthly wages, with wages counted only up to the EPF wage ceiling.",
};

export const EDLI_BONUS_CAP: Sourced<number> = {
  value: 175000,
  sourceUrl: "https://pmvbry.epfindia.gov.in/insurance-scheme-edli/",
  sourceName: "EPFO, Employees' Deposit Linked Insurance Scheme",
  lastVerified: "2026-10-28",
  note: "The cap on the part of the EDLI payout derived from 50% of the average PF balance.",
};

/* ------------------------------------------------------------------ */
/*  EPF and EPS — the retirement savings themselves                   */
/* ------------------------------------------------------------------ */

/*
  Contribution rates. Used to estimate what a corpus might have grown
  to from a salary and a length of service, which is the only honest
  way to put a number on it: there is no way to look up a real
  person's actual balance.
*/
export const EPF_EMPLOYEE_RATE: Sourced<number> = {
  value: 0.12,
  sourceUrl: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf",
  sourceName: "EPFO, present rates of contribution",
  lastVerified: "2026-10-28",
  note: "The employee contributes 12% of basic wages plus dearness allowance plus retaining allowance.",
};

export const EPF_EMPLOYER_RATE: Sourced<number> = {
  value: 0.12,
  sourceUrl: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf",
  sourceName: "EPFO, present rates of contribution",
  lastVerified: "2026-10-28",
  note:
    "The employer contributes 12% of pay, of which 8.33% goes to the Pension Fund (EPS) and 3.67% to EPF. " +
    "The employer also pays 0.5% towards EDLI.",
};

/*
  The wage ceiling, which is genuinely in transition and is therefore
  recorded twice rather than picked between.

  The estimate does NOT depend on resolving this. The EPF corpus is
  estimated from the salary the family actually enters, and the EDLI
  figure is bounded by its own floor and ceiling above, so neither
  changes if the ceiling moves. The ceiling is here because the basis
  text explains the 35 x wages calculation and has to be able to say
  what "wages" is capped at.
*/
export const EPF_WAGE_CEILING_HISTORIC: Sourced<number> = {
  value: 15000,
  sourceUrl: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/WageCeiling.pdf",
  sourceName: "EPFO, wage ceiling history",
  lastVerified: "2026-10-28",
  note:
    "The monthly wage ceiling for mandatory EPF coverage from 1 September 2014. This is the ceiling that " +
    "applied over the working life of anyone who died before late 2026.",
};

export const EPF_WAGE_CEILING_CURRENT: Sourced<number> = {
  value: 25000,
  sourceUrl:
    "https://www.labour.gov.in/static/uploads/2026/09/4f607a88c5342aeb980c6b999997caab.pdf",
  sourceName: "Ministry of Labour and Employment, cabinet approval",
  lastVerified: "2026-10-28",
  note:
    "The ceiling was raised from ₹15,000 to ₹25,000 per month with effect from 17 September 2026. Whether " +
    "this also moves the EDLI calculation has not been confirmed against an EPFO notification, so the " +
    "estimate stays with the EDLI scheme page's own figures.",
};

/* ------------------------------------------------------------------ */
/*  Gratuity                                                          */
/* ------------------------------------------------------------------ */

/*
  The statutory formula, under the Payment of Gratuity Act, 1972:

    15/26 x last drawn monthly wages x completed years of service

  The 15 and the 26 are in the Act: section 4(2) sets fifteen days'
  wages per completed year, and the Explanation to it says the monthly
  rate last drawn is divided by twenty-six and multiplied by fifteen.

  ONE POINT THAT MATTERS A GREAT DEAL HERE. Section 4(1) normally
  requires five years of continuous service. Its proviso removes that
  requirement where the employment ended in the employee's death. So
  for every family using this app, the five-year rule does not apply.
  Getting this wrong would wrongly tell a bereaved family that a
  relative who worked three years was owed nothing.
*/
export const GRATUITY_DAYS_PER_YEAR: Sourced<number> = {
  value: 15,
  sourceUrl: "https://www.indiacode.nic.in/bitstream/123456789/15318/1/payment-of-gratuity-act-1972.pdf",
  sourceName: "The Payment of Gratuity Act, 1972, section 4(2)",
  lastVerified: "2026-10-28",
  note: "Fifteen days' wages for every completed year of service.",
};

export const GRATUITY_DAYS_PER_MONTH: Sourced<number> = {
  value: 26,
  sourceUrl: "https://www.indiacode.nic.in/bitstream/123456789/15318/1/payment-of-gratuity-act-1972.pdf",
  sourceName: "The Payment of Gratuity Act, 1972, Explanation to section 4(2)",
  lastVerified: "2026-10-28",
  note: "The monthly wage last drawn is divided by twenty-six to reach a daily rate.",
};

export const GRATUITY_MAXIMUM: Sourced<number> = {
  value: 2000000,
  sourceUrl: "https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=178218",
  sourceName: "Press Information Bureau, Payment of Gratuity (Amendment) Act, 2018",
  lastVerified: "2026-10-28",
  note:
    "The ceiling on statutory gratuity, raised from ₹10,00,000 to ₹20,00,000 with effect from 29 March 2018. " +
    "The Ministry of Labour's own labour-codes FAQ confirms ₹20,00,000 as the current maximum.",
};

/*
  Not a figure but a rule, and the one most likely to be applied
  wrongly. Kept here so the basis text on screen can cite it.
*/
export const GRATUITY_DEATH_WAIVES_FIVE_YEARS: Sourced<boolean> = {
  value: true,
  sourceUrl: "https://www.indiacode.nic.in/bitstream/123456789/15318/1/payment-of-gratuity-act-1972.pdf",
  sourceName: "The Payment of Gratuity Act, 1972, proviso to section 4(1)",
  lastVerified: "2026-10-28",
  note:
    "The usual requirement of five years of continuous service does not apply where the employment ended " +
    "because of the employee's death.",
};

/* ------------------------------------------------------------------ */
/*  National context — why searching is worth the effort              */
/* ------------------------------------------------------------------ */

/*
  This is NOT part of anybody's estimate and is never added into the
  headline. It is on the page for one reason: a family who has been
  told "there is probably nothing" needs to know how much money sits
  unclaimed nationally before deciding whether to spend an afternoon
  on UDGAM.

  Measured as the Reserve Bank's liability for deposits transferred to
  the Depositor Education and Awareness Fund. A deposit goes there
  after ten years untouched, and remains claimable from the original
  bank with interest.
*/
export const RBI_UNCLAIMED_DEPOSITS_CRORE: Sourced<number> = {
  value: 78212.53,
  sourceUrl:
    "https://rbidocs.rbi.org.in/rdocs/AnnualReport/PDFs/12THERESERVEBANKACCOUNTS87AC12CB35D24C80956B35B679DC809C.PDF",
  sourceName: "Reserve Bank of India, Annual Report 2023-24, the Reserve Bank's accounts",
  lastVerified: "2026-10-28",
  note:
    "Unclaimed deposits held in the Depositor Education and Awareness Fund as on 31 March 2024, up from " +
    "₹62,224.89 crore a year earlier. These remain claimable from the bank that held them.",
};

/** The as-on date for the figure above, shown beside it. */
export const RBI_UNCLAIMED_AS_ON = "2024-03-31";

/*
  The number of years a deposit must sit untouched before it moves to
  the DEA Fund. From the RBI's own page for the public.
*/
export const UNCLAIMED_DEPOSIT_YEARS: Sourced<number> = {
  value: 10,
  sourceUrl: "https://www.rbi.org.in/commonman/english/scripts/PressReleases.aspx?Id=3367",
  sourceName: "Reserve Bank of India, unclaimed deposits",
  lastVerified: "2026-10-28",
  note:
    "A savings or current balance not operated for ten years, or a term deposit not claimed within ten years " +
    "of maturity, is classified as an unclaimed deposit and moved to the DEA Fund.",
};

/*
  NO NATIONAL IEPF TOTAL IS RECORDED HERE, DELIBERATELY.

  The brief asked for one. Searching iepf.gov.in and mca.gov.in did
  not produce a current, officially published total that could be
  cited with an as-on date: what turned up was a 2019 presentation
  giving claims released, and a press note quoting an indicative
  figure for unclaimed dividends nationally. Neither is a fund total.

  Rather than print a number that cannot be stood behind, the app
  states the rule below, which IS verifiable, and sends the family to
  IEPF to search. The rule is the part that actually helps them.
*/
export const IEPF_TRANSFER_YEARS: Sourced<number> = {
  value: 7,
  sourceUrl:
    "https://www.iepf.gov.in/content/iepf/global/master/Home/AboutUS/about-us/IEPFLegislation.html",
  sourceName: "Investor Education and Protection Fund Authority, legislation",
  lastVerified: "2026-10-28",
  note:
    "Under the Companies Act, 2013, a dividend unclaimed for seven years, and the shares it relates to, are " +
    "transferred to the IEPF. Both can still be claimed back from the Authority.",
};

/* ------------------------------------------------------------------ */
/*  Conservative defaults, used only when nothing better is known     */
/* ------------------------------------------------------------------ */

/*
  These are NOT statutory and are NOT sourced to anybody, because
  nothing official exists to source them to. They are deliberately
  wide, deliberately low at the bottom end, and every line item that
  uses one is marked "estimated" on screen and says in its own words
  that it is a placeholder until the family enters a salary.

  They exist so that a family who knows only "the deceased person had
  a job" sees a range rather than a zero. A zero would be read as
  "there is nothing", which is the opposite of the truth.
*/
export const DEFAULT_EPF_CORPUS_RANGE = {
  low: 50000,
  high: 400000,
  note:
    "Used only when employment is known but no salary or length of service was entered. Replaced by a " +
    "calculation from the actual figures as soon as either is given.",
};

/** How wide a band to put around a point calculation like gratuity. */
export const POINT_ESTIMATE_BAND = 0.15;
