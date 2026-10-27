import { useEffect, useState } from "react";
import { getSupabase, hasSupabaseKeys } from "@/lib/supabase/client";

/*
  WHO IS SIGNED IN.

  One email, one code, no password. The same flow both creates the
  account the first time and logs in every time after, which is why the
  button says "Log in or create account" rather than making a grieving
  person choose between two doors that do the same thing.

  Supabase does the work:
    send   → supabase.auth.signInWithOtp({ email })
    verify → supabase.auth.verifyOtp({ email, token, type: "email" })

  Three things this file is careful about.

  1. ANONYMOUS SESSIONS ARE NOT "SIGNED IN".
     The case store can sign a browser in anonymously so Row Level
     Security has somebody to check against. That is plumbing, not a
     login: the header must not offer to log such a person out, and
     must still offer them an account. So isAnonymous is tracked
     separately and the UI only treats a real email session as signed in.

  2. SWITCHING ACCOUNTS WIPES THE DEVICE.
     If one account's answers were still in localStorage when a second
     account logged in on the same browser, that second person would
     open the wizard and find a stranger's dead relative in the boxes.
     The last real account's id is remembered so that can be spotted
     and the local copy cleared before anything is shown.

     Only real accounts are remembered, deliberately: somebody who
     typed answers before making an account keeps them when they log
     in for the first time, which is the behaviour they would expect.

  3. NO RAW ERRORS.
     Supabase's messages are written for developers. Every one of them
     is translated here into something a person in distress can act on.
*/

/** False when the keys are missing, so the UI can explain rather than fail. */
export const canEmailSignIn = hasSupabaseKeys;

export type AuthUser = {
  id: string;
  email: string | null;
  /** True for the invisible sign-in the case store does. Not a login. */
  isAnonymous: boolean;
};

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: AuthUser };

/** What a send or verify attempt came to. Never carries a raw error. */
export type AuthResult = { ok: true } | { ok: false; message: string };

// ---------------------------------------------------------------------------
//  Remembering which real account this device last belonged to.
// ---------------------------------------------------------------------------

/*
  Its own tiny wrappers rather than the case store's, so that importing
  "who is signed in" does not drag the whole case layer into the header
  of every page.
*/
const USER_KEY = "aasra.userId";

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
    /* Nothing worth bothering anyone about. */
  }
}

function removeLocal(key: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    /* As above. */
  }
}

/*
  Called whenever the session changes. If a different real account has
  appeared, the previous one's answers are cleared off this device
  before any page can render them.
*/
async function noteAccount(user: AuthUser | null): Promise<void> {
  // Anonymous plumbing is not an account, and must not clear anything.
  if (!user || user.isAnonymous) return;

  const previous = readLocal(USER_KEY);
  if (previous === user.id) return;

  if (previous) {
    const { clearLocalCase } = await import("@/lib/caseStore");
    clearLocalCase();
  }

  writeLocal(USER_KEY, user.id);
}

// ---------------------------------------------------------------------------
//  Reading the session
// ---------------------------------------------------------------------------

type SupabaseUserish = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
};

function toUser(user: SupabaseUserish | null | undefined): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    isAnonymous: user.is_anonymous === true,
  };
}

/*
  The hook the header and the login page use. Starts at "loading" so
  nothing flickers between "Log in" and "Log out" on first paint.
*/
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    function apply(user: AuthUser | null) {
      if (cancelled) return;
      setState(user ? { status: "signed-in", user } : { status: "signed-out" });
      void noteAccount(user);
    }

    void (async () => {
      // No keys, or the client could not be built. There is nobody to
      // be signed in as, which is a fine answer rather than an error.
      if (!supabase) {
        apply(null);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        apply(toUser(data.session?.user));
      } catch (error) {
        console.error("Session check failed:", error instanceof Error ? error.message : error);
        apply(null);
      }
    })();

    const subscription = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => apply(toUser(session?.user))).data.subscription
      : null;

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}

/** True only for a real email account — never for the anonymous plumbing. */
export function isRealAccount(state: AuthState): boolean {
  return state.status === "signed-in" && !state.user.isAnonymous;
}

// ---------------------------------------------------------------------------
//  Sending and checking the code
// ---------------------------------------------------------------------------

const NOT_CONFIGURED =
  "Signing in by email is not switched on in this copy of the app yet. You can still carry on — " +
  "your answers are kept safely on this device.";

export async function sendEmailCode(email: string): Promise<AuthResult> {
  const address = email.trim();

  // Checked here as well as by the browser, because the form can be
  // submitted by pressing Enter before the browser has had its say.
  if (!address || !address.includes("@")) {
    return { ok: false, message: "That does not look like an email address. Could you check it over?" };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      // The one flow does both jobs: first time it makes the account,
      // every time after it logs in.
      options: { shouldCreateUser: true },
    });

    if (error) {
      console.error("Could not send a sign-in code:", error.message);
      return { ok: false, message: friendlyAuthMessage(error.message) };
    }

    return { ok: true };
  } catch (error) {
    console.error("Could not send a sign-in code:", error instanceof Error ? error.message : error);
    return { ok: false, message: OFFLINE };
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  const token = code.replace(/\s/g, "");

  if (token.length < 6) {
    return { ok: false, message: "The code is six digits. Have another look at the email." };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });

    if (error) {
      console.error("Could not verify a sign-in code:", error.message);
      return { ok: false, message: friendlyAuthMessage(error.message) };
    }

    return { ok: true };
  } catch (error) {
    console.error("Could not verify a sign-in code:", error instanceof Error ? error.message : error);
    return { ok: false, message: OFFLINE };
  }
}

/*
  Signing out clears the answers kept on this device as well as the
  session. Leaving them behind would mean the next person to use this
  browser — often a relative, on a shared laptop — opening the wizard
  and finding somebody else's family already filled in.
*/
export async function signOut(): Promise<void> {
  const supabase = getSupabase();

  try {
    await supabase?.auth.signOut();
  } catch (error) {
    // Even if the server call fails, the local copy still goes.
    console.error("Sign-out failed:", error instanceof Error ? error.message : error);
  }

  removeLocal(USER_KEY);

  const { clearLocalCase } = await import("@/lib/caseStore");
  clearLocalCase();
}

// ---------------------------------------------------------------------------
//  Turning Supabase's words into ours
// ---------------------------------------------------------------------------

const OFFLINE =
  "We could not reach our server just then — it may be your connection. Please try again in a moment.";

/*
  Matched on keywords rather than exact strings, because Supabase's
  wording changes between versions and a missed match must never leak
  a developer message onto this screen. Anything unrecognised falls
  through to a calm, honest line.
*/
export function friendlyAuthMessage(raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes("expired") || message.includes("invalid") || message.includes("token")) {
    return (
      "That code did not work. They only last about an hour, so it may simply have gone stale — " +
      "send yourself a fresh one and try again."
    );
  }

  if (message.includes("rate limit") || message.includes("only request this after") || message.includes("too many")) {
    return "That is a few codes in quick succession. Give it a minute, then ask for another.";
  }

  if (message.includes("email") && (message.includes("not valid") || message.includes("invalid"))) {
    return "That does not look like an email address. Could you check it over?";
  }

  if (message.includes("signups not allowed") || message.includes("disabled")) {
    return (
      "New accounts are switched off at the moment. You can still carry on without one — " +
      "your answers are kept safely on this device."
    );
  }

  if (message.includes("fetch") || message.includes("network")) return OFFLINE;

  return "That did not work, and it is very likely our fault rather than yours. Please try once more.";
}
