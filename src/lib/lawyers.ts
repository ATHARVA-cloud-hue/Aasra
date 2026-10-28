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

/*
  The specialties the panel is filtered by, as stable slugs.

  Slugs rather than labels, deliberately. A lawyer's specialty is
  stored in the database and compared against this list, so the stored
  value has to mean the same thing in every language. The words shown
  on the filter buttons come from lawyers.specialties.<slug>.
*/
export const SPECIALTIES = ["hindu", "muslim", "christian", "property", "general"] as const;

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
  /** The languages a difficult conversation can be held in. */
  languages: string[] | null;
  years_experience: number | null;
  /** Whole rupees, not paise. Null means "ask us". */
  consultation_price_inr: number | null;
  full_case_price_inr: number | null;
  /*
    The lawyer's own description of their practice, as written in the
    database. Shown as it was entered, in whatever language it was
    written in, because it is a person's own words rather than part of
    the app. A demo lawyer has null here and is described from
    lawyers.demoBios.<id> instead, so the sample panel reads correctly
    in all five languages.
  */
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

  Each has bio: null. The description shown on the card comes from
  lawyers.demoBios.<id> in the dictionaries, so the sample panel reads
  correctly in all five languages. Names, cities and languages stay as
  they are, being proper nouns.
*/
export const DEMO_LAWYERS: Lawyer[] = [
  {
    id: "demo-1",
    name: "Adv. Rukmini Deshpande",
    photo_url: null,
    specialty: "hindu",
    city: "Pune",
    languages: ["Marathi", "Hindi", "English"],
    years_experience: 18,
    consultation_price_inr: 1500,
    full_case_price_inr: 35000,
    bio: null,
  },
  {
    id: "demo-2",
    name: "Adv. Imran Qureshi",
    photo_url: null,
    specialty: "muslim",
    city: "Hyderabad",
    languages: ["Urdu", "Telugu", "Hindi", "English"],
    years_experience: 22,
    consultation_price_inr: 2000,
    full_case_price_inr: 48000,
    bio: null,
  },
  {
    id: "demo-3",
    name: "Adv. Maria Fernandes",
    photo_url: null,
    specialty: "christian",
    city: "Mumbai",
    languages: ["English", "Konkani", "Hindi"],
    years_experience: 14,
    consultation_price_inr: 1800,
    full_case_price_inr: 42000,
    bio: null,
  },
  {
    id: "demo-4",
    name: "Adv. Harpreet Singh Bedi",
    photo_url: null,
    specialty: "property",
    city: "Delhi",
    languages: ["Punjabi", "Hindi", "English"],
    years_experience: 26,
    consultation_price_inr: 2500,
    full_case_price_inr: 65000,
    bio: null,
  },
  {
    id: "demo-5",
    name: "Adv. Lakshmi Iyer",
    photo_url: null,
    specialty: "general",
    city: "Chennai",
    languages: ["Tamil", "Malayalam", "English"],
    years_experience: 9,
    consultation_price_inr: 900,
    full_case_price_inr: 24000,
    bio: null,
  },
];

/*
  True for one of the five sample lawyers above. Those have no bio of
  their own, so the card describes them from lawyers.demoBios.<id>.
*/
export function isDemoLawyer(lawyer: Lawyer): boolean {
  return lawyer.id.startsWith("demo-");
}

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
  /*
    The new row's id, when one was created. The payment step needs it
    so a verified payment can be written back against the right
    request. Absent on the WhatsApp path, where there is no row.
  */
  consultationId?: string;
  /** The fee quoted, in whole rupees, so the screen can show it. */
  amountInr?: number | null;
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
    const { rememberedCaseId } = await import("@/lib/caseStore");

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        lawyer_id: isDemoLawyer(lawyer) ? null : lawyer.id,
        // Kept as plain text too, so the request still makes sense if the
        // lawyer later leaves the panel.
        lawyer_name: lawyer.name,
        case_id: rememberedCaseId(),
        kind: "consultation",
        /*
          A snapshot of the fee as quoted on the card just now. Stored
          rather than looked up later, so a lawyer raising their price
          next year cannot change what this family was quoted.

          The amount actually CHARGED is re-read on the server, from
          the lawyer record, and never from here. This column is the
          record of the quote, not the instruction to charge.
        */
        amount_inr: lawyer.consultation_price_inr,
        payment_status: "unpaid",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Consultation request failed:", error.message);
      return { result: "whatsapp", reason: error.code ?? "insert-failed" };
    }

    return {
      result: "saved",
      consultationId: typeof data?.id === "string" ? data.id : undefined,
      amountInr: lawyer.consultation_price_inr,
    };
  } catch (error) {
    console.error("Consultation request failed:", error instanceof Error ? error.message : error);
    return { result: "whatsapp", reason: "exception" };
  }
}

/* ------------------------------------------------------------------ */

/*
  "₹1,500" in Indian digit grouping, or null when there is no price,
  which the card shows as a translated "On request".

  The grouping stays en-IN in every language on purpose. Indian
  grouping (1,50,000 rather than 150,000) is what a reader in India
  expects whichever language the page is in, and leaving the digits as
  Latin numerals keeps a price recognisable next to the ₹ sign.
*/
export function rupees(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined) return null;
  return `₹${amount.toLocaleString("en-IN")}`;
}
