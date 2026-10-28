"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FIRST_INTAKE_HREF } from "@/lib/journey";
import {
  canEmailSignIn,
  createAccount,
  logIn,
  MIN_PASSWORD,
  signOut,
  useAuth,
} from "@/lib/auth";

/*
  LOG IN, OR CREATE AN ACCOUNT — an email and a password.

  One form, with a toggle at the top deciding which of the two it is.
  The fields are the same either way, so switching between them keeps
  whatever has already been typed: somebody who tried to log in, found
  they had never signed up, and switched across should not have to type
  their email again.

  What it is careful about:

  - A WRONG PASSWORD IS NOT AN ERROR MESSAGE, it is a nudge. It says
    that passwords are case-sensitive and that caps lock is worth
    checking, and the two commonest mistakes (signing up with an email
    that already exists, logging in without ever having signed up) each
    name the toggle that fixes them.

  - THE PASSWORD CAN BE SHOWN. Typing eight unseen characters on a
    phone, in the state people are in when they reach this page, is
    hard enough to be a reason they give up.

  - WITHOUT SUPABASE KEYS the form is not shown as broken. It explains
    that accounts are not switched on in this copy and points at the
    choices below, which work perfectly well without one.
*/

type Mode = "login" | "create";

export function EmailLogin() {
  const t = useTranslations("login");
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");

  const router = useRouter();
  const auth = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  function switchTo(next: Mode) {
    setMode(next);
    // The email and password stay; only what we were told about the
    // last attempt is no longer true.
    setProblem(null);
    setConfirm(null);
  }

  async function submit() {
    setBusy(true);
    setProblem(null);
    setConfirm(null);

    const result =
      mode === "create"
        ? await createAccount(email, password, fullName)
        : await logIn(email, password);

    /*
      The library hands back a message KEY, never a sentence. The
      lookup happens here, which is what lets a wrong password read
      correctly in five languages.
    */
    if (result.status === "problem") {
      setBusy(false);
      setProblem(tAuth(result.messageKey, { min: MIN_PASSWORD }));
      return;
    }

    // Account made, but it needs confirming before it can be used.
    // Nothing has gone wrong, so this is not shown as a problem, and
    // the form is left usable so they can log in once they are back.
    if (result.status === "confirm") {
      setBusy(false);
      setMode("login");
      setConfirm(tAuth(result.messageKey, { min: MIN_PASSWORD }));
      return;
    }

    /*
      Logged in. Mark this as a real family rather than a demo one —
      somebody who has gone to the trouble of an account is not
      browsing — and go to the first question.

      Left busy on purpose: the page is about to change, and a button
      that springs back to life first would invite a second tap.
    */
    const { setMode: setCaseMode } = await import("@/lib/caseStore");
    setCaseMode("real");
    router.push(FIRST_INTAKE_HREF);
  }

  // ---- Already logged in ----
  if (auth.status === "signed-in" && !auth.user.isAnonymous) {
    return (
      <Card>
        <h2 className="text-xl">{t("signedInTitle")}</h2>
        <p className="mt-2 text-ink-soft">
          {t("signedInBody", { email: auth.user.email ?? t("yourAccount") })}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href={FIRST_INTAKE_HREF} className="w-full sm:w-auto">
            {t("carryOn")}
          </Button>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void signOut()}>
            {tNav("logOut")}
          </Button>
        </div>
      </Card>
    );
  }

  // ---- No keys: explain, do not pretend ----
  if (!canEmailSignIn) {
    return (
      <Card>
        <h2 className="text-xl">{t("notConfiguredTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("notConfiguredBody")}</p>
        <p className="mt-4 text-sm text-ink-muted">{t("notConfiguredNote")}</p>
      </Card>
    );
  }

  const creating = mode === "create";

  return (
    <Card>
      <h2 className="text-xl">{creating ? t("createTitle") : t("loginTitle")}</h2>
      <p className="mt-2 text-ink-soft">{creating ? t("createBody") : t("loginBody")}</p>

      {/*
        Radio buttons under the pills, not plain <button>s: arrow keys
        move between the two and a screen reader announces them as the
        one either/or choice they are.
      */}
      <fieldset className="mt-6 border-0 p-0">
        <legend className="sr-only">{t("modeLegend")}</legend>
        <div className="flex flex-wrap gap-2">
          <Toggle label={t("modeLogin")} chosen={!creating} onPick={() => switchTo("login")} />
          <Toggle label={t("modeCreate")} chosen={creating} onPick={() => switchTo("create")} />
        </div>
      </fieldset>

      <form
        className="mt-6 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="login-email" className="text-base font-medium text-ink">
            {t("emailLabel")}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            disabled={busy}
            className={box}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <label htmlFor="login-password" className="text-base font-medium text-ink">
              {t("passwordLabel")}
            </label>
            <button
              type="button"
              onClick={() => setReveal((shown) => !shown)}
              className="text-sm text-sage-700 underline-offset-4 hover:underline"
            >
              {reveal ? t("hidePassword") : t("showPassword")}
            </button>
          </div>

          {creating && (
            <p className="mt-1 text-sm text-ink-muted">
              {t("passwordHint", { min: MIN_PASSWORD })}
            </p>
          )}

          {/*
            dir="ltr" on both credential boxes. An email address and a
            password are typed left to right whatever the page
            language, and a right-to-left box would put the cursor and
            the @ sign in confusing places.
          */}
          <input
            id="login-password"
            type={reveal ? "text" : "password"}
            autoComplete={creating ? "new-password" : "current-password"}
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            className={box}
          />
        </div>

        {creating && (
          <div>
            <label htmlFor="login-name" className="text-base font-medium text-ink">
              {t("nameLabel")}
            </label>
            <p className="mt-1 text-sm text-ink-muted">{t("nameHint")}</p>
            <input
              id="login-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={busy}
              className={box}
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={busy || !email.trim() || !password}
        >
          {busy
            ? creating
              ? t("creating")
              : t("loggingIn")
            : creating
              ? t("createButton")
              : t("loginButton")}
        </Button>
      </form>

      <Problem text={problem} />

      {confirm && (
        <p className="mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">
          {confirm}
        </p>
      )}

      <p className="mt-5 text-sm text-ink-muted">{t("privacyNote")}</p>
    </Card>
  );
}

/* Shared by all three boxes, so they cannot drift apart. */
const box =
  "mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60";

function Toggle({
  label,
  chosen,
  onPick,
}: {
  label: string;
  chosen: boolean;
  onPick: () => void;
}) {
  return (
    <label
      className={
        "min-h-12 cursor-pointer rounded-2xl border px-4 py-2.5 text-base transition-colors duration-200 " +
        "flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 " +
        "focus-within:outline-sage-400 " +
        (chosen
          ? "border-sage-600 bg-sage-600 text-white"
          : "border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50")
      }
    >
      <input type="radio" name="login-mode" checked={chosen} onChange={onPick} className="sr-only" />
      {label}
    </label>
  );
}

/*
  Clay rather than red. It is almost always a mistyped password or the
  wrong one of the two modes, neither of which deserves alarm, and the
  design rules out red anyway.
*/
function Problem({ text }: { text: string | null }) {
  if (!text) return null;

  return (
    <p className="mt-4 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="alert">
      {text}
    </p>
  );
}
