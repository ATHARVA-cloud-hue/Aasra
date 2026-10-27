import { getSupabase, hasSupabaseKeys } from "@/lib/supabase/client";

/*
  THE LAWYERS A FAMILY CAN ASK FOR.

  "Talk to a lawyer" is the one button on every page that leads to a
  real person, so this file has the same promise as the case store:
  it must never leave the page empty and it must never show an error.

  Where the list comes from, tried in this order:

  1. SUPABASE — the "lawyers" table, when the keys are set and the
     table exists. This is the real panel.
  2. DEMO_LAWYERS below — five fictional lawyers, used when there are
     no keys or the read fails for any reason.

  Because step 2 always exists, /lawyers always renders something.
  A family who has just been told "speak to a lawyer" should never
  arrive at a blank screen.

  The demo lawyers are deliberately obvious inventions, in the same
  spirit as src/lib/demo.ts: nobody should mistake one for a real
  practitioner they could ring tomorrow.
*/

/** The specialties we sort the panel by. Also the filter buttons. */
export const SPECIALTIES = [
  "Hindu succession",
  "Muslim personal law",
  "Christian/Parsi succession",
  "Property disputes",
  "General",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** One row of public.lawyers. The column names match the table exactly. */
export type Lawyer = {
  id: string;
  name: string;
  /** Optional headshot. Cards fall back to initials when it is missing. */
  photo_url: string | null;
  /** One of SPECIALTIES. Free text in the database so the panel can grow. */
  specialty: string | null;
  city: string | null;
  /** The languages they can hold a difficult conversation in. */
  languages: string[] | null;
  years_experience: number | null;
  /** Whole rupees, not paise. Null means "ask us". */
  consultation_price_inr: number | null;
  full_case_price_inr: number | null;
  bio: string | null;
};

/*
  The columns we ask Supabase for, written out rather than "*", so a
  new column added to the table later cannot quietly change what this
  page sends to the browser.
*/
const LAWYER_COLUMNS =
  "id, name, photo_url, specialty, city, languages, years_experience, consultation_price_inr, full_case_price_inr, bio";

/*
  Five fictional lawyers, one per specialty, with a spread of prices so
  a family can see that the panel is not all one price bracket.
*/
export const DEMO_LAWYERS: Lawyer[] = [
  {
    id: "demo-1",
    name: "Adv. Rukmini Deshpande",
    photo_url: null,
    specialty: "Hindu succession",
    city: "Pune",
    languages: ["Marathi", "Hindi", "English"],
    years_experience: 18,
    consultation_price_inr: 1500,
    full_case_price_inr: 35000,
    bio:
      "Works almost entirely with families after a death — succession certificates, bank transmission and the " +
      "paperwork a municipal office asks for. Happy to speak to elderly parents directly.",
  },
  {
    id: "demo-2",
    name: "Adv. Imran Qureshi",
    photo_url: null,
    specialty: "Muslim personal law",
    city: "Hyderabad",
    languages: ["Urdu", "Telugu", "Hindi", "English"],
    years_experience: 22,
    consultation_price_inr: 2000,
    full_case_price_inr: 48000,
    bio:
      "Calculates shares under Muslim personal law, including where the family follows a particular school, and " +
      "explains the result to everyone involved before anything is divided.",
  },
  {
    id: "demo-3",
    name: "Adv. Maria Fernandes",
    photo_url: null,
    specialty: "Christian/Parsi succession",
    city: "Mumbai",
    languages: ["English", "Konkani", "Hindi"],
    years_experience: 14,
    consultation_price_inr: 1800,
    full_case_price_inr: 42000,
    bio:
      "Probate and letters of administration under the Indian Succession Act, and the extra steps a family living " +
      "outside India runs into. Takes calls across time zones.",
  },
  {
    id: "demo-4",
    name: "Adv. Harpreet Singh Bedi",
    photo_url: null,
    specialty: "Property disputes",
    city: "Delhi",
    languages: ["Punjabi", "Hindi", "English"],
    years_experience: 26,
    consultation_price_inr: 2500,
    full_case_price_inr: 65000,
    bio:
      "Ancestral land, flats held jointly, and the cases where one relative will not sign. Will say plainly when a " +
      "dispute is not worth fighting.",
  },
  {
    id: "demo-5",
    name: "Adv. Lakshmi Iyer",
    photo_url: null,
    specialty: "General",
    city: "Chennai",
    languages: ["Tamil", "Malayalam", "English"],
    years_experience: 9,
    consultation_price_inr: 900,
    full_case_price_inr: 24000,
    bio:
      "A good first conversation if you do not yet know what kind of help you need. Nominee claims, EPF and " +
      "insurance, and she will tell you honestly when no lawyer is needed at all.",
  },
];

/** Where a list of lawyers came from, so the page can label itself honestly. */
export type LawyerSource = "supabase" | "demo";

export type LoadedLawyers = {
  lawyers: Lawyer[];
  from: LawyerSource;
};

/*
  The panel. Falls back to the demo list on every failure path — no
  keys, no table, an empty table, a network error — because an empty
  "Talk to a lawyer" page is worse than a clearly-labelled sample one.
*/
export async function loadLawyers(): Promise<LoadedLawyers> {
  if (!hasSupabaseKeys) return { lawyers: DEMO_LAWYERS, from: "demo" };

  const supabase = getSupabase();
  if (!supabase) return { lawyers: DEMO_LAWYERS, from: "demo" };

  try {
    const { data, error } = await supabase
      .from("lawyers")
      .select(LAWYER_COLUMNS)
      .eq("is_active", true)
      .order("years_experience", { ascending: false });

    if (error) {
      console.error("Lawyer list read failed:", error.message);
      return { lawyers: DEMO_LAWYERS, from: "demo" };
    }

    const rows = (data ?? []) as Lawyer[];

    // A table that exists but is empty is still an empty page, so the
    // sample panel stands in until somebody adds the real one.
    if (rows.length === 0) return { lawyers: DEMO_LAWYERS, from: "demo" };

    return { lawyers: rows, from: "supabase" };
  } catch (error) {
    console.error("Lawyer list read failed:", error instanceof Error ? error.message : error);
    return { lawyers: DEMO_LAWYERS, from: "demo" };
  }
}

/* ------------------------------------------------------------------ */
/*  Asking for a consultation                                          */
/* ------------------------------------------------------------------ */

/*
  What happened when a family asked to speak to someone:

  "saved"    — a row is in public.consultations and one of us will see it.
  "whatsapp" — we could not record it, so the caller should open
               WhatsApp instead with the lawyer's name filled in.

  There is no "failed". If the database cannot take the request, the
  family still gets a way through to a person, which is the whole
  point of the button.
*/
export type ConsultationOutcome = {
  result: "saved" | "whatsapp";
  /** A short code for the console. Never shown to the family. */
  reason?: string;
};

export async function requestConsultation(lawyer: Lawyer): Promise<ConsultationOutcome> {
  if (!hasSupabaseKeys) return { result: "whatsapp", reason: "no-keys" };

  const supabase = getSupabase();
  if (!supabase) return { result: "whatsapp", reason: "no-client" };

  try {
    /*
      Only a real, logged-in account can own a request, and the reason
      is not security — it is that we have to be able to answer.

      An anonymous session (the invisible one the case store makes so
      Row Level Security has somebody to check) has no email and no
      phone number. Recording a request against it would let us show
      "one of us will be in touch" to somebody we have no way on earth
      of reaching. So those go to WhatsApp instead, where the family is
      holding the other end of the conversation.

      We also do not sign anyone in from this button: being asked to
      make an account because you tapped "talk to a lawyer" is exactly
      the wrong moment for it.
    */
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) return { result: "whatsapp", reason: "not-signed-in" };
    if (user.is_anonymous) return { result: "whatsapp", reason: "anonymous" };

    // A demo lawyer has no row in the table to point at, so the
    // request goes through as a name only.
    const isRealRow = !lawyer.id.startsWith("demo-");

    const { rememberedCaseId } = await import("@/lib/caseStore");

    const { error } = await supabase.from("consultations").insert({
      lawyer_id: isRealRow ? lawyer.id : null,
      // Kept as plain text too, so the request still makes sense if the
      // lawyer later leaves the panel.
      lawyer_name: lawyer.name,
      case_id: rememberedCaseId(),
      kind: "consultation",
    });

    if (error) {
      console.error("Consultation request failed:", error.message);
      return { result: "whatsapp", reason: error.code ?? "insert-failed" };
    }

    return { result: "saved" };
  } catch (error) {
    console.error("Consultation request failed:", error instanceof Error ? error.message : error);
    return { result: "whatsapp", reason: "exception" };
  }
}

/* ------------------------------------------------------------------ */

/** "₹1,500" in Indian digit grouping, or "On request" when unpriced. */
export function rupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "On request";
  return `₹${amount.toLocaleString("en-IN")}`;
}
