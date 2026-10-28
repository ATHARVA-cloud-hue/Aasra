import { useEffect, useState } from "react";
import { getSupabase, hasSupabaseKeys } from "@/lib/supabase/client";

/*
  WHO IS SIGNED IN.

  An email and a password. Supabase does the work:
    create → supabase.auth.signUp({ email, password })
    log in → supabase.auth.signInWithPassword({ email, password })

  A password rather than a one-time code, deliberately: a code needs an
  email to actually arrive, and an email that is slow, filtered or
  silently dropped by a misconfigured template is a locked door with no
  handle. A password works the moment the keys are set, with nothing
  else to go wrong and nothing to wait for.

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
//  Creating an account, and logging in
// ---------------------------------------------------------------------------

/*
  WHY THESE RETURN KEYS AND NOT SENTENCES

  Every outcome below carries the KEY of a message under the "auth"
  namespace, not the message itself. The login form looks the words up,
  which is what lets a wrong password read correctly in five languages.

  Supabase's own error strings stay in English in the console, where
  they are useful, and never reach the screen.
*/

/*
  The shortest password accepted. Supabase's own floor is lower, so
  this is ours and is checked before the call goes out: telling someone
  their password is too short after a round trip, with the box already
  cleared, is a small cruelty.
*/
export const MIN_PASSWORD = 8;

/*
  The one check both forms share. Returns the key of the thing to say,
  or null when there is nothing wrong.

  Done here as well as in the browser's own validation because either
  form can be submitted by pressing Enter before the browser has had
  its say.
*/
function credentialProblem(email: string, password: string, requireLength: boolean): string | null {
  if (!email.trim().includes("@")) return "badEmail";
  if (!password) return "noPassword";
  if (requireLength && password.length < MIN_PASSWORD) return "shortPassword";
  return null;
}

/*
  What a sign-up or log-in came to.

  "confirm" is its own outcome rather than a failure. If email
  confirmations are left switched on in the Supabase dashboard, signUp
  creates the account but gives back no session — so the person is not
  logged in, and nothing has gone wrong either. Calling that an error
  would be a lie, and calling it success would strand them on a page
  that thinks they are logged in when they are not.

  messageKey is a key under the "auth" namespace in every dictionary.
*/
export type AuthResult =
  | { status: "done" }
  | { status: "confirm"; messageKey: string }
  | { status: "problem"; messageKey: string };

export async function createAccount(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResult> {
  const problem = credentialProblem(email, password, true);
  if (problem) return { status: "problem", messageKey: problem };

  const supabase = getSupabase();
  if (!supabase) return { status: "problem", messageKey: "notConfigured" };

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Could not create an account:", error.message);
      return { status: "problem", messageKey: authMessageKey(error.message) };
    }

    // Account made, but no session: confirmations are switched on, so
    // there is an email on its way and nothing more to do here.
    if (!data.session) return { status: "confirm", messageKey: "confirmNeeded" };

    await upsertProfile(fullName);
    return { status: "done" };
  } catch (error) {
    console.error("Could not create an account:", error instanceof Error ? error.message : error);
    return { status: "problem", messageKey: "offline" };
  }
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  /*
    Length is deliberately not enforced here, only on sign-up. An
    account made before this minimum existed is still a real account,
    and refusing to even try its password would lock somebody out of
    their own case over a rule we invented after they joined.
  */
  const problem = credentialProblem(email, password, false);
  if (problem) return { status: "problem", messageKey: problem };

  const supabase = getSupabase();
  if (!supabase) return { status: "problem", messageKey: "notConfigured" };

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Could not log in:", error.message);
      return { status: "problem", messageKey: authMessageKey(error.message) };
    }

    await upsertProfile();
    return { status: "done" };
  } catch (error) {
    console.error("Could not log in:", error instanceof Error ? error.message : error);
    return { status: "problem", messageKey: "offline" };
  }
}

/*
  Keep public.profiles in step with the account.

  Run after both sign-up and log-in, so a profile row exists even for
  an account created before this table did.

  It cannot fail loudly, by design. A missing table, a policy that says
  no, a dropped connection — none of that should stop somebody reaching
  their own case, which is the thing they actually came for. The row is
  our bookkeeping, not theirs.

  full_name is left out of the row entirely when we have not been given
  one, rather than sent as null: an upsert only writes the columns it is
  handed, so omitting it keeps whatever name is already there instead of
  wiping it on the next log-in.
*/
export async function upsertProfile(fullName?: string | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    // No user, or the anonymous plumbing — neither gets a profile.
    if (!user || user.is_anonymous) return;

    const row: { id: string; email: string | null; full_name?: string } = {
      id: user.id,
      email: user.email ?? null,
    };

    const name = (fullName ?? "").trim();
    if (name) row.full_name = name;

    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
    if (error) console.error("Could not save the profile row:", error.message);
  } catch (error) {
    console.error("Could not save the profile row:", error instanceof Error ? error.message : error);
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
//  Turning Supabase's words into our message keys
// ---------------------------------------------------------------------------

/*
  Matched on keywords rather than exact strings, because Supabase's
  wording changes between versions and a missed match must never leak a
  developer message onto this screen. Anything unrecognised falls
  through to a calm, honest line.

  Returns a key under the "auth" namespace, never a sentence.
*/
export function authMessageKey(raw: string): string {
  const message = raw.toLowerCase();

  /*
    The specific cases come first, and the order is load-bearing.
    "Invalid login credentials" and "Invalid email" both contain
    "invalid", so a generic check on that word would swallow the one
    message on this screen that people most need to read correctly.
  */

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "alreadyRegistered";
  }

  if (message.includes("login credentials") || message.includes("invalid credentials")) {
    return "wrongPassword";
  }

  if (
    message.includes("password") &&
    (message.includes("at least") || message.includes("weak") || message.includes("short"))
  ) {
    return "shortPassword";
  }

  if (message.includes("not confirmed")) return "notConfirmed";

  if (
    message.includes("rate limit") ||
    message.includes("only request this after") ||
    message.includes("too many")
  ) {
    return "rateLimited";
  }

  if (
    message.includes("email") &&
    (message.includes("not valid") ||
      message.includes("invalid") ||
      message.includes("unable to validate"))
  ) {
    return "badEmail";
  }

  if (message.includes("signups not allowed") || message.includes("disabled")) {
    return "signupsDisabled";
  }

  if (message.includes("fetch") || message.includes("network")) return "offline";

  return "generic";
}
