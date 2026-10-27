/*
  THE OFFICIAL PLACES TO LOOK.

  Every link below is a government or regulator site, typed out in full
  so it can be checked against this file at a glance. We do not
  shorten, redirect or proxy any of them: a family following a link
  from a page about their dead parent's money should be able to see
  exactly where it goes before they click.

  Equally important is what we do NOT do. We never ask for a family's
  password, PAN, Aadhaar number or one-time code to "search for them".
  They search on the official site themselves, in their own browser,
  and simply tell us what they found. Any service that offers to do
  this for you in exchange for your credentials is a scam, and grieving
  families are targeted by exactly that.
*/

export type Registry = {
  /** Used as a React key and for the form fields. */
  id: string;
  /** What kind of money this is, in plain words. */
  name: string;
  /** Who runs the search. */
  where: string;
  /** The official site. Opened in a new tab. */
  url: string;
  /** What the portal actually is. */
  what: string;
  /** Why it is worth a family's time. */
  why: string;
  /** Saved as the asset type when a family reports a find. */
  assetType: string;
  /** Example text in the "what did you find" box. */
  placeholder: string;
};

export const REGISTRIES: Registry[] = [
  {
    id: "udgam",
    name: "Forgotten bank accounts",
    where: "RBI UDGAM",
    url: "https://udgam.rbi.org.in/",
    what:
      "A single search across India's banks, run by the Reserve Bank. When an account sits untouched for ten " +
      "years, the money is moved to the RBI and listed here.",
    why:
      "Most families never learn about an old account in another city, or one opened decades ago before a move. " +
      "This is the one place that looks across every bank at once.",
    assetType: "Unclaimed bank deposit",
    placeholder: "For example: an SBI account in Nashik, ₹42,000, reference UDG123456",
  },
  {
    id: "iepf",
    name: "Shares and unpaid dividends",
    where: "IEPF",
    url: "https://www.iepf.gov.in/",
    what:
      "The government's Investor Education and Protection Fund. After seven years unclaimed, company shares and " +
      "their dividends are transferred here — and they can be claimed back.",
    why:
      "Shares bought on paper in the 1980s or 1990s are easy for a family to miss entirely. They do not expire, " +
      "and they are often worth far more now than when they were bought.",
    assetType: "Unclaimed shares or dividend",
    placeholder: "For example: 200 shares in Tata Steel, folio A0012345",
  },
  {
    id: "epfo",
    name: "Provident fund",
    where: "EPFO",
    url: "https://www.epfindia.gov.in/",
    what:
      "The Employees' Provident Fund Organisation holds retirement savings from every job a person ever had, " +
      "along with a pension and a linked insurance payout.",
    why:
      "Money is often left behind at an employer from years ago, and the family of someone who was still working " +
      "may also be owed a pension and an insurance amount they were never told about.",
    assetType: "Provident fund",
    placeholder: "For example: UAN 100123456789, from his years at Tata Motors",
  },
  {
    id: "irdai",
    name: "Life insurance policies",
    where: "IRDAI",
    url: "https://irdai.gov.in/",
    what:
      "The insurance regulator. Its site explains how to trace a policy and lists every licensed insurer, with " +
      "the complaint route if one of them will not answer you.",
    why:
      "Families often know a policy existed but cannot find the paperwork. A policy that lapsed, or matured and " +
      "was never collected, still belongs to the family.",
    assetType: "Life insurance policy",
    placeholder: "For example: an LIC policy, number 4471xxxx, taken around 2005",
  },
];

/*
  Two more places genuinely worth a look. They are listed without
  buttons because we have not had their exact official addresses
  confirmed, and a guessed link on this page is not acceptable — a
  wrong address is how people end up on a convincing fake.
*/
export const ALSO_WORTH_CHECKING = [
  {
    name: "Mutual funds",
    where: "MF Central",
    why: "Old folios held under a previous address or an earlier phone number.",
  },
  {
    name: "Post office savings",
    where: "India Post",
    why: "Small savings schemes and recurring deposits, often opened decades ago.",
  },
];
