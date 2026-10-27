"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FIRST_INTAKE_HREF } from "@/lib/journey";
import { canEmailSignIn, sendEmailCode, signOut, useAuth, verifyEmailCode } from "@/lib/auth";

/*
  LOG IN OR CREATE ACCOUNT — two steps, no password.

  Step one is an email box. Step two is the six digits we just sent.
  There is no third step, and no separate "sign up": the first code
  somebody uses creates their account, and every code after that logs
  them in. A person who has just lost somebody should not have to work
  out which of two buttons applies to them.

  What it is careful about:

  - WRONG AND EXPIRED CODES read the same way as a missed phone call,
    not a failure. The message always says what to do next, and the
    "Send me another" button is right there.

  - THE EMAIL STAYS ON SCREEN at step two, with a way back to change
    it, because the single commonest reason a code never arrives is a
    typo nobody can see any more.

  - WITHOUT SUPABASE KEYS the form is not shown as broken. It explains
    that accounts are not switched on in this copy and points at the
    choices below, which work perfectly well without one.
*/

type Step = "email" | "code";

/** How long before "Send me another" becomes tappable, in seconds. */
const RESEND_WAIT = 30;

export function EmailLogin() {
  const router = useRouter();
  const auth = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  const codeRef = useRef<HTMLInputElement>(null);

  // Count down to the next "Send me another".
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  // Put the cursor in the digits box the moment it appears.
  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function send(resending = false) {
    setBusy(true);
    setProblem(null);
    setNotice(null);

    const result = await sendEmailCode(email);
    setBusy(false);

    if (!result.ok) {
      setProblem(result.message);
      return;
    }

    setStep("code");
    setWait(RESEND_WAIT);
    setNotice(resending ? "Sent again. The newest code is the one that works." : null);
  }

  async function verify() {
    setBusy(true);
    setProblem(null);
    setNotice(null);

    const result = await verifyEmailCode(email, code);

    if (!result.ok) {
      setBusy(false);
      setCode("");
      setProblem(result.message);
      codeRef.current?.focus();
      return;
    }

    /*
      Logged in. Mark this as a real family rather than a demo one —
      somebody who has gone to the trouble of an account is not
      browsing — and go to the first question.

      Left busy on purpose: the page is about to change, and a button
      that springs back to life first would invite a second tap.
    */
    const { setMode } = await import("@/lib/caseStore");
    setMode("real");
    router.push(FIRST_INTAKE_HREF);
  }

  // ---- Already logged in ----
  if (auth.status === "signed-in" && !auth.user.isAnonymous) {
    return (
      <Card>
        <h2 className="text-xl">You are logged in</h2>
        <p className="mt-2 text-ink-soft">
          As {auth.user.email ?? "your account"}. Your case follows this account, so you can pick it up on your phone
          or anyone else&apos;s computer.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href={FIRST_INTAKE_HREF} className="w-full sm:w-auto">
            Carry on with my case
          </Button>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>
      </Card>
    );
  }

  // ---- No keys: explain, do not pretend ----
  if (!canEmailSignIn) {
    return (
      <Card>
        <h2 className="text-xl">Log in or create account</h2>
        <p className="mt-2 text-ink-soft">
          Accounts are not switched on in this copy of the app, so there is nothing to log in to yet. Nothing is
          lost: carry on below and your answers are kept safely on this device.
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          When accounts are switched on, you will be able to enter your email, receive a six-digit code, and reach
          your case from any phone or computer.
        </p>
      </Card>
    );
  }

  // ---- Step one: the email ----
  if (step === "email") {
    return (
      <Card>
        <h2 className="text-xl">Log in or create account</h2>
        <p className="mt-2 text-ink-soft">
          Enter your email and we will send you a six-digit code. There is no password to remember, and no difference
          between logging in and signing up — the first code makes your account.
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor="login-email" className="text-base font-medium text-ink">
            Your email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
          />

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full sm:w-auto"
            disabled={busy || !email.trim()}
          >
            {busy ? "Sending…" : "Send me a code"}
          </Button>
        </form>

        <Problem text={problem} />

        <p className="mt-4 text-sm text-ink-muted">
          We use your email to find your case again, and for nothing else. No password, and no marketing.
        </p>
      </Card>
    );
  }

  // ---- Step two: the six digits ----
  return (
    <Card>
      <h2 className="text-xl">Check your email</h2>
      <p className="mt-2 text-ink-soft">
        We have sent a six-digit code to <span className="text-ink">{email}</span>. It can take a minute, and it is
        worth a look in your spam folder.
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void verify();
        }}
      >
        <label htmlFor="login-code" className="text-base font-medium text-ink">
          The six digits
        </label>
        <input
          ref={codeRef}
          id="login-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          disabled={busy}
          className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-lg tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
        />

        <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={busy || code.length < 6}>
          {busy ? "Checking…" : "Verify and continue"}
        </Button>
      </form>

      <Problem text={problem} />

      {notice && (
        <p className="mt-4 text-sm text-sage-800" role="status">
          <span aria-hidden="true">✓ </span>
          {notice}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row">
        <Button
          variant="quiet"
          disabled={busy || wait > 0}
          onClick={() => void send(true)}
          className="sm:w-auto"
        >
          {wait > 0 ? `Send me another in ${wait}s` : "Send me another"}
        </Button>

        <Button
          variant="quiet"
          disabled={busy}
          onClick={() => {
            setStep("email");
            setCode("");
            setProblem(null);
            setNotice(null);
          }}
          className="sm:w-auto"
        >
          Use a different email
        </Button>
      </div>
    </Card>
  );
}

/*
  Clay rather than red. It is almost always a stale code or a typo,
  neither of which deserves alarm — and the brief rules out red anyway.
*/
function Problem({ text }: { text: string | null }) {
  if (!text) return null;

  return (
    <p className="mt-4 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="alert">
      {text}
    </p>
  );
}
