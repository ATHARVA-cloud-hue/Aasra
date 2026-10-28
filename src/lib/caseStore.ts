import { getSupabase, hasSupabaseKeys } from "@/lib/supabase/client";

/*
  THE CASE STORE — where a family's answers go, and come back from.

  Every page that saves or reads a case uses this file. It has one job:
  put the answers somewhere safe, and never, ever break.

  There are three places an answer can live, tried in this order:

  1. SUPABASE — the real database. Used when the keys are set, the
     tables exist, and we have a signed-in user.
  2. THE BROWSER (localStorage) — used when Supabase is not available,
     or a call fails. The family still sees their own answers, on their
     own device. Nothing is lost mid-demo.
  3. NOTHING — if even localStorage is blocked (a private window), the
     app keeps working for the current page and simply forgets later.

  Because step 2 always exists, no save can ever show the family an
  error. The worst case is "saved on this device only".
*/

// ---------------------------------------------------------------------------
//  What a case looks like. These names match the columns in schema.sql.
// ---------------------------------------------------------------------------

export type CaseRecord = {
  id?: string;
  deceased_name?: string | null;
  relationship?: string | null;
  date_of_death?: string | null;
  place_of_death?: string | null;
  religion?: string | null;
  has_will?: boolean | null;
  assets_abroad?: boolean | null;
  owned_business?: boolean | null;
  spouse_name?: string | null;
  children_names?: string | null;
  mother_living?: boolean | null;
  mother_name?: string | null;
  known_assets_note?: string | null;
  last_step?: string | null;

  /*
    The optional answers behind the recovery estimate. All nullable,
    all skippable: the estimate falls back to wider ranges without
    them rather than refusing to work.
  */
  employed_at_death?: boolean | null;
  /** Whole years. Used with the salary for EPF and gratuity. */
  years_of_service?: number | null;
  /** Rupees per month, as last drawn. */
  last_monthly_salary?: number | null;
  /** The state whose land record portal to show first. */
  property_state?: string | null;
};

export type AssetInput = {
  asset_type?: string | null;
  details?: string | null;
  institution?: string | null;
  source?: "family" | "discovered";
};

/** Where a save actually ended up, so the UI can be honest about it. */
export type SaveOutcome = {
  where: "supabase" | "device";
  caseId?: string;
  /** A short code for why we fell back, for the console. Never shown raw. */
  reason?: string;
};

/*
  "demo" = the user chose "Continue as a demo family". Sample families
  are shown on purpose.
  "real" = this is a real family entering their own details. Sample data
  must never appear.
*/
export type Mode = "demo" | "real";

// ---------------------------------------------------------------------------
//  The browser's own memory. Wrapped so a private window cannot crash us.
// ---------------------------------------------------------------------------

const MODE_KEY = "aasra.mode";
const CASE_ID_KEY = "aasra.caseId";
const DRAFT_KEY = "aasra.draft";

function readLocal(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null; // Private window, or storage switched off.
  }
}

function writeLocal(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* Nothing we can do, and nothing worth bothering the family about. */
  }
}

/*
  Wipe everything this device remembers about a case.

  Called when somebody logs out, and when a different account signs in
  on the same browser. Both matter for the same reason: these keys hold
  a dead person's name, their date of death and their family. On a
  shared laptop — which is most laptops, in most Indian households —
  the next person to open the app must not find any of it.

  The four keys below are the complete list. If a fifth is ever added
  above, it belongs here too.
*/
export function clearLocalCase(): void {
  for (const key of [DRAFT_KEY, CASE_ID_KEY, CHOICES_KEY, MODE_KEY]) {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      /* Private window — there was nothing stored to clear anyway. */
    }
  }
}

export function getMode(): Mode {
  return readLocal(MODE_KEY) === "demo" ? "demo" : "real";
}

export function setMode(mode: Mode): void {
  writeLocal(MODE_KEY, mode);
}

/*
  WHICH BUTTON THEY PRESSED.

  Columns like has_will are true/false in the database, which cannot
  tell "they said Not sure" apart from "we never asked". Both arrive
  back as empty.

  That difference matters to the family: if they thoughtfully chose
  "Not sure" and came back to find nothing selected, it would look as
  though we had lost their answer. So the button they actually pressed
  is remembered here, on their own device, purely so the question looks
  right when they return. The database still stores the honest
  true / false / unknown.
*/
const CHOICES_KEY = "aasra.choices";

export function readChoices(): Record<string, string> {
  const raw = readLocal(CHOICES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveChoices(patch: Record<string, string>): void {
  writeLocal(CHOICES_KEY, JSON.stringify({ ...readChoices(), ...patch }));
}

/*
  The case id this device already knows about, without going anywhere
  near the database and without creating anything.

  ensureCaseId() below will happily start a case if there is none, which
  is right when a family is answering questions and wrong everywhere
  else. Somewhere that only wants to *mention* the case — asking a
  lawyer for a consultation, say — uses this instead, so browsing the
  panel never silently opens a case file on someone.
*/
export function rememberedCaseId(): string | null {
  return readLocal(CASE_ID_KEY);
}

/** The draft kept on this device — the fallback copy of every answer. */
export function readDraft(): CaseRecord {
  const raw = readLocal(DRAFT_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CaseRecord) : {};
  } catch {
    return {};
  }
}

function mergeDraft(patch: CaseRecord): CaseRecord {
  const merged = { ...readDraft(), ...patch };
  writeLocal(DRAFT_KEY, JSON.stringify(merged));
  return merged;
}

// ---------------------------------------------------------------------------
//  Signing in, invisibly.
// ---------------------------------------------------------------------------

/*
  Row Level Security needs to know who you are, and there are two ways
  it can find out. They are tried in this order, which is the whole
  point of this function:

  1. A REAL ACCOUNT. Somebody who logged in with their email and
     password — see src/lib/auth.ts. Their case follows them to any
     device they log in on, which is the reason to have an account at
     all.

  2. ANONYMOUS SIGN-IN. The browser gets a user account with no email
     and no password. Enough for the database to keep this case private
     from everyone else, but it lives and dies with this browser.

  The order matters and must not be reversed. If anonymous came first,
  somebody who had just logged in would carry on writing to the
  throwaway account instead of their own, and their case would vanish
  the next time they opened the app on their phone.

  Anonymous sign-in needs "Anonymous sign-ins" switched on in the
  Supabase dashboard (Authentication → Sign In / Providers). When it is
  off, this returns false and every caller falls back to this device —
  which is a perfectly good outcome, not an error.
*/

/*
  Remembered after the first refusal. Without this, every save on a
  project with anonymous sign-in switched off would make its own
  pointless round trip and log its own identical error.
*/
let anonymousUnavailable = false;

async function ensureSignedIn(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // 1. A session we already have — a real account, or an anonymous
    //    one from earlier in this browser.
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;

    // 2. Nobody at all. Fall back, unless we know it is switched off.
    if (anonymousUnavailable) return false;

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      anonymousUnavailable = true;
      console.error(
        "Anonymous sign-in unavailable, keeping answers on this device instead:",
        error.message,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Sign-in check failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

// ---------------------------------------------------------------------------
//  Finding, or starting, this family's case.
// ---------------------------------------------------------------------------

/*
  The id of the case we are working on, or null if we could not reach the
  database. Creates the row the first time it is called.
*/
export async function ensureCaseId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  if (!(await ensureSignedIn())) return null;

  // Already know it? Make sure it is still really there (the tables may
  // have been rebuilt, or this device remembers a case we deleted).
  const remembered = readLocal(CASE_ID_KEY);
  if (remembered) {
    try {
      const { data, error } = await supabase.from("cases").select("id").eq("id", remembered).maybeSingle();
      if (!error && data) return remembered;
    } catch {
      /* Fall through and look again below. */
    }
  }

  try {
    // Reuse the most recent case belonging to this user, if there is one.
    // RLS already limits this to our own rows, so no filter is needed.
    const { data: mine } = await supabase
      .from("cases")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);

    if (mine && mine.length > 0) {
      writeLocal(CASE_ID_KEY, mine[0].id as string);
      return mine[0].id as string;
    }

    // Nothing yet — start one. user_id fills itself in from the policy default.
    const { data: created, error } = await supabase.from("cases").insert({}).select("id").single();
    if (error || !created) {
      console.error("Could not create a case:", error?.message);
      return null;
    }

    writeLocal(CASE_ID_KEY, created.id as string);
    return created.id as string;
  } catch (error) {
    console.error("Case lookup failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Saving.
// ---------------------------------------------------------------------------

/*
  Save some answers. Always writes to the device first, so the family's
  typing can never be lost, then tries the database on top.
*/
export async function saveCase(patch: CaseRecord): Promise<SaveOutcome> {
  mergeDraft(patch);

  if (!hasSupabaseKeys) return { where: "device", reason: "no-keys" };

  const caseId = await ensureCaseId();
  if (!caseId) return { where: "device", reason: "no-case" };

  const supabase = getSupabase();
  if (!supabase) return { where: "device", reason: "no-client" };

  try {
    // Never send "id" to the database as something to change.
    const { id: _ignored, ...columns } = patch;
    void _ignored;

    const { error } = await supabase.from("cases").update(columns).eq("id", caseId);
    if (error) {
      console.error("Case save failed:", error.message);
      return { where: "device", reason: error.code ?? "update-failed" };
    }
    return { where: "supabase", caseId };
  } catch (error) {
    console.error("Case save failed:", error instanceof Error ? error.message : error);
    return { where: "device", reason: "exception" };
  }
}

/** Add one or more assets to this case. Quietly does nothing if offline. */
export async function addAssets(assets: AssetInput[]): Promise<SaveOutcome> {
  if (assets.length === 0) return { where: "device", reason: "nothing-to-add" };
  if (!hasSupabaseKeys) return { where: "device", reason: "no-keys" };

  const caseId = await ensureCaseId();
  const supabase = getSupabase();
  if (!caseId || !supabase) return { where: "device", reason: "no-case" };

  try {
    const rows = assets.map((asset) => ({ ...asset, case_id: caseId }));
    const { error } = await supabase.from("assets").insert(rows);
    if (error) {
      console.error("Asset save failed:", error.message);
      return { where: "device", reason: error.code ?? "insert-failed" };
    }
    return { where: "supabase", caseId };
  } catch (error) {
    console.error("Asset save failed:", error instanceof Error ? error.message : error);
    return { where: "device", reason: "exception" };
  }
}

/** Remember that a document was read, and what came out of it. */
export async function recordDocument(input: {
  doc_type?: string | null;
  original_name?: string | null;
  extracted?: unknown;
}): Promise<SaveOutcome> {
  if (!hasSupabaseKeys) return { where: "device", reason: "no-keys" };

  const caseId = await ensureCaseId();
  const supabase = getSupabase();
  if (!caseId || !supabase) return { where: "device", reason: "no-case" };

  try {
    const { error } = await supabase.from("documents").insert({
      case_id: caseId,
      doc_type: input.doc_type ?? null,
      original_name: input.original_name ?? null,
      extracted: input.extracted ?? null,
      status: "read",
    });
    if (error) {
      console.error("Document record failed:", error.message);
      return { where: "device", reason: error.code ?? "insert-failed" };
    }
    return { where: "supabase", caseId };
  } catch (error) {
    console.error("Document record failed:", error instanceof Error ? error.message : error);
    return { where: "device", reason: "exception" };
  }
}

// ---------------------------------------------------------------------------
//  Reading back.
// ---------------------------------------------------------------------------

export type LoadedCase = {
  record: CaseRecord;
  /** Where these answers came from, so a page can label itself honestly. */
  from: "supabase" | "device" | "empty";
};

/** One saved asset, as the case page and tracker display it. */
export type AssetRow = {
  id: string;
  asset_type: string | null;
  details: string | null;
  institution: string | null;
  source: string | null;
};

/*
  Everything saved against this case: things the family told us about,
  and things we found for them. Returns an empty list rather than
  failing, so a page can always render.
*/
export async function loadAssets(): Promise<AssetRow[]> {
  if (!hasSupabaseKeys) return [];

  const supabase = getSupabase();
  const caseId = supabase ? await ensureCaseId() : null;
  if (!supabase || !caseId) return [];

  try {
    const { data, error } = await supabase
      .from("assets")
      .select("id, asset_type, details, institution, source")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Asset read failed:", error.message);
      return [];
    }
    return (data ?? []) as AssetRow[];
  } catch (error) {
    console.error("Asset read failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** One consultation request, as the case tracker shows it. */
export type ConsultationRow = {
  id: string;
  lawyer_name: string | null;
  status: string | null;
  payment_status: string | null;
  amount_inr: number | null;
  created_at: string | null;
};

/*
  The family's consultation requests, newest first.

  Returns an empty list rather than failing, so the case tracker can
  always render. Row Level Security already limits this to the signed-in
  family's own rows, which is why there is no filter here.
*/
export async function loadConsultations(): Promise<ConsultationRow[]> {
  if (!hasSupabaseKeys) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    /*
      No ensureCaseId() call. A consultation belongs to the account, not
      to a case, and asking for a case id here would create an empty
      case row for somebody who only ever asked to speak to a lawyer.
    */
    const { data } = await supabase.auth.getSession();
    if (!data.session) return [];

    const { data: rows, error } = await supabase
      .from("consultations")
      .select("id, lawyer_name, status, payment_status, amount_inr, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Consultation read failed:", error.message);
      return [];
    }

    return (rows ?? []) as ConsultationRow[];
  } catch (error) {
    console.error("Consultation read failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function loadCase(): Promise<LoadedCase> {
  const draft = readDraft();

  if (hasSupabaseKeys) {
    const supabase = getSupabase();
    const caseId = supabase ? await ensureCaseId() : null;

    if (supabase && caseId) {
      try {
        const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
        if (!error && data) {
          // The database wins, but anything it has not got yet (because a
          // save failed earlier) is topped up from the device copy.
          return { record: { ...draft, ...stripEmpty(data as CaseRecord) }, from: "supabase" };
        }
        if (error) console.error("Case read failed:", error.message);
      } catch (error) {
        console.error("Case read failed:", error instanceof Error ? error.message : error);
      }
    }
  }

  const hasSomething = Object.values(draft).some((value) => value !== null && value !== undefined && value !== "");
  return { record: draft, from: hasSomething ? "device" : "empty" };
}

/** Drop null/empty columns so they do not blank out a good local value. */
function stripEmpty(record: CaseRecord): CaseRecord {
  const out: CaseRecord = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined && value !== "") {
      out[key as keyof CaseRecord] = value as never;
    }
  }
  return out;
}

/** True when this case has real answers in it (used to hide sample data). */
export function hasRealAnswers(record: CaseRecord): boolean {
  return Boolean(record.deceased_name || record.date_of_death || record.spouse_name || record.known_assets_note);
}
