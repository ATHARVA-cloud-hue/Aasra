/*
  THE OFFICIAL PLACES TO LOOK.

  Every link below is a government or regulator site, typed out in full
  so it can be checked against this file at a glance. The app does not
  shorten, redirect or proxy any of them: a family following a link
  from a page about a dead parent's money should be able to see exactly
  where it goes before clicking.

  Equally important is what the app does NOT do. It never asks for a
  family's password, PAN, Aadhaar number or one-time code in order to
  "search for them". The family searches on the official site
  themselves, in their own browser, and enters what they found. Any
  service that offers to do this for you in exchange for your
  credentials is a scam, and grieving families are targeted by exactly
  that.

  THE WORDS ARE NOT HERE. Each registry's name, description and example
  text live under hiddenAssets.registries.<id> in messages/*.json, so
  they can be read in five languages. What stays here is the part that
  must be identical in every language: the id, the official URL, the
  institution's own name, and the asset type.
*/

export type Registry = {
  /** Used as a React key, for the form fields, and as the message key. */
  id: string;
  /*
    Who runs the search, in the institution's own name. Not translated:
    "RBI UDGAM" is what is written on the site a family will land on,
    and a translated name would make the page harder to recognise, not
    easier.
  */
  where: string;
  /** The official site. Opened in a new tab. */
  url: string;
  /*
    Saved as the asset type when a family reports a find. Deliberately
    English in every language: this is a value stored in the database
    and read back later, not a label. Translating stored data would
    mean the same account appearing as two different kinds of asset
    depending on the language it was entered in.
  */
  assetType: string;
};

export const REGISTRIES: Registry[] = [
  {
    id: "udgam",
    where: "RBI UDGAM",
    url: "https://udgam.rbi.org.in/",
    assetType: "Unclaimed bank deposit",
  },
  {
    id: "iepf",
    where: "IEPF",
    url: "https://www.iepf.gov.in/",
    assetType: "Unclaimed shares or dividend",
  },
  {
    id: "epfo",
    where: "EPFO",
    url: "https://www.epfindia.gov.in/",
    assetType: "Provident fund",
  },
  {
    id: "irdai",
    where: "IRDAI",
    url: "https://irdai.gov.in/",
    assetType: "Life insurance policy",
  },
  {
    id: "mca",
    where: "MCA",
    url: "https://www.mca.gov.in/",
    assetType: "Company shareholding or directorship",
  },
  {
    id: "udyam",
    where: "Udyam (MSME)",
    url: "https://udyamregistration.gov.in/",
    assetType: "Registered business (Udyam / MSME)",
  },
];

/*
  Two more places genuinely worth a look. They are listed without
  buttons because their exact official addresses have not been
  confirmed, and a guessed link on this page is not acceptable: a wrong
  address is how people end up on a convincing fake.
*/
export const ALSO_WORTH_CHECKING = [
  { id: "mutualFunds", where: "MF Central" },
  { id: "postOffice", where: "India Post" },
];
