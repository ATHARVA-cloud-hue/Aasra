/*
  STATE LAND RECORD PORTALS.

  Every URL below was opened and checked on the date in VERIFIED_ON.
  Each one is on a gov.in domain, served a land-records page, and
  named the state revenue department that runs it.

  THE RULE THIS FILE FOLLOWS, same as src/lib/registries.ts: a state
  whose official address could not be confirmed is listed WITHOUT a
  link. A guessed land-records URL is worse than no URL at all,
  because the people searching for a dead parent's plot are exactly
  the people a convincing fake is built for. Several commercial sites
  rank above the official ones for these searches.

  THE WORDS ARE NOT HERE. Each portal's "how to search" line lives
  under landRecords.portals.<id> in messages/*.json. What stays here
  is the part that must be identical in every language: the state
  name, the portal's own name, and the address.
*/

/** The date every URL in this file was last opened and checked. */
export const VERIFIED_ON = "2026-10-28";

export type LandPortal = {
  /** Key under landRecords.portals, and the React key. */
  id: string;
  /** The state, as the family would pick it from a list. */
  state: string;
  /*
    The portal's own name, untranslated. "Mahabhulekh" is what is
    written at the top of the page the family will land on, and
    translating it would make the page harder to recognise.
  */
  portalName: string;
  /** The official address, or null when it could not be confirmed. */
  url: string | null;
};

/*
  The seven states checked for this release, plus the central
  programme. Ordered alphabetically by state so the list is
  predictable to scan.
*/
export const LAND_PORTALS: LandPortal[] = [
  {
    id: "gujarat",
    state: "Gujarat",
    portalName: "AnyRoR",
    url: "https://anyror.gujarat.gov.in/",
  },
  {
    id: "karnataka",
    state: "Karnataka",
    portalName: "Bhoomi",
    url: "https://landrecords.karnataka.gov.in/",
  },
  {
    id: "maharashtra",
    state: "Maharashtra",
    portalName: "Mahabhulekh",
    url: "https://bhulekh.mahabhumi.gov.in/",
  },
  {
    id: "rajasthan",
    state: "Rajasthan",
    portalName: "Apna Khata",
    url: "https://apnakhata.rajasthan.gov.in/",
  },
  {
    id: "tamilNadu",
    state: "Tamil Nadu",
    portalName: "Patta Chitta",
    url: "https://eservices.tn.gov.in/eservicesnew/home.html",
  },
  {
    id: "telangana",
    state: "Telangana",
    portalName: "Bhu Bharati",
    url: "https://bhubharati.telangana.gov.in/",
  },
  {
    id: "uttarPradesh",
    state: "Uttar Pradesh",
    portalName: "Bhulekh",
    url: "https://upbhulekh.gov.in/",
  },
];

/*
  The central reference. Not a place to search for one plot, but the
  Department of Land Resources programme that every state portal sits
  under, and the right place to start for a state not listed above.
*/
export const CENTRAL_LAND_PROGRAMME = {
  id: "dilrmp",
  portalName: "DILRMP",
  url: "https://dilrmp.gov.in/",
};

/*
  States and union territories with no confirmed link yet.

  These are listed by name so a family from Kerala does not conclude
  the app has nothing for them, and so whoever extends this file can
  see exactly what is left to verify. Adding one means opening its
  official portal, confirming the domain and the department, and
  moving it into LAND_PORTALS above with the date in VERIFIED_ON.
*/
export const STATES_WITHOUT_CONFIRMED_PORTAL: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Kerala",
  "Madhya Pradesh",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Sikkim",
  "Tripura",
  "Uttarakhand",
  "West Bengal",
];

/** Every state the dropdown offers, confirmed or not. */
export const ALL_STATES: string[] = [
  ...LAND_PORTALS.map((portal) => portal.state),
  ...STATES_WITHOUT_CONFIRMED_PORTAL,
].sort((a, b) => a.localeCompare(b));

/* ------------------------------------------------------------------ */
/*  Matching a state to a portal                                      */
/* ------------------------------------------------------------------ */

/** The portal for a state name, or undefined if there is no confirmed one. */
export function portalForState(state: string | null | undefined): LandPortal | undefined {
  if (!state) return undefined;

  const wanted = state.trim().toLowerCase();
  return LAND_PORTALS.find((portal) => portal.state.toLowerCase() === wanted);
}

/*
  Guess the state from a town or city, so a family who entered "Pune"
  and nothing else still sees the Maharashtra portal first.

  Deliberately a short list of the largest cities in the seven states
  that have a confirmed portal. It is a convenience, not a lookup: a
  miss simply means the family picks their state from the list, which
  they can always do. Nothing is claimed on the strength of a guess.
*/
const CITY_TO_STATE: Record<string, string> = {
  // Maharashtra
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  nagpur: "Maharashtra",
  nashik: "Maharashtra",
  thane: "Maharashtra",
  aurangabad: "Maharashtra",
  solapur: "Maharashtra",
  kolhapur: "Maharashtra",
  // Gujarat
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  vadodara: "Gujarat",
  rajkot: "Gujarat",
  bhavnagar: "Gujarat",
  // Karnataka
  bengaluru: "Karnataka",
  bangalore: "Karnataka",
  mysuru: "Karnataka",
  mysore: "Karnataka",
  hubli: "Karnataka",
  mangaluru: "Karnataka",
  mangalore: "Karnataka",
  // Uttar Pradesh
  lucknow: "Uttar Pradesh",
  kanpur: "Uttar Pradesh",
  varanasi: "Uttar Pradesh",
  agra: "Uttar Pradesh",
  prayagraj: "Uttar Pradesh",
  allahabad: "Uttar Pradesh",
  meerut: "Uttar Pradesh",
  noida: "Uttar Pradesh",
  // Rajasthan
  jaipur: "Rajasthan",
  jodhpur: "Rajasthan",
  udaipur: "Rajasthan",
  kota: "Rajasthan",
  ajmer: "Rajasthan",
  // Tamil Nadu
  chennai: "Tamil Nadu",
  coimbatore: "Tamil Nadu",
  madurai: "Tamil Nadu",
  tiruchirappalli: "Tamil Nadu",
  salem: "Tamil Nadu",
  // Telangana
  hyderabad: "Telangana",
  warangal: "Telangana",
  nizamabad: "Telangana",
  karimnagar: "Telangana",
};

/*
  Work out which state's portal to show first.

  An explicitly chosen state always wins. Only if none was chosen is
  the town of death used as a hint, and that is a hint about where
  property might be, nothing more.
*/
export function suggestPortal(
  chosenState: string | null | undefined,
  placeOfDeath: string | null | undefined,
): { portal?: LandPortal; state?: string; guessedFromPlace: boolean } {
  const chosen = portalForState(chosenState);
  if (chosen) return { portal: chosen, state: chosen.state, guessedFromPlace: false };

  // A state was named but has no confirmed portal. Say so rather than
  // falling back to a different state's portal.
  if (chosenState?.trim()) {
    return { state: chosenState.trim(), guessedFromPlace: false };
  }

  const place = (placeOfDeath ?? "").trim().toLowerCase();
  if (!place) return { guessedFromPlace: false };

  // Match on a whole word, so "Pune" in "Pune District" still works
  // but "Punealur" does not.
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (new RegExp(`\\b${city}\\b`).test(place)) {
      const portal = portalForState(state);
      if (portal) return { portal, state, guessedFromPlace: true };
    }
  }

  return { guessedFromPlace: false };
}
