"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FIRST_INTAKE_HREF } from "@/lib/journey";

/*
  THE TWO WAYS IN — and the switch that decides everything downstream.

  This is where "demo" and "real" are set, and it is the only place
  either is chosen. Every later page reads it with getMode():

  - "Continue as a demo family" → demo. Sample families are shown on
    purpose, and nothing the visitor types is treated as real.
  - "This is my own family" → real. Sample data is never shown again,
    and answers are saved as a genuine case.

  Real is the safer default: if someone arrives straight at a question
  without passing through here, they are treated as a real family and
  never shown somebody else's name as if it were their own.
*/

export function LoginChoices() {
  const router = useRouter();
  const [going, setGoing] = useState<"demo" | "real" | null>(null);

  async function choose(mode: "demo" | "real") {
    setGoing(mode);

    // Loaded here rather than at the top of the file, so opening this
    // page does not wait for the database library.
    const { setMode } = await import("@/lib/caseStore");
    setMode(mode);

    router.push(FIRST_INTAKE_HREF);
  }

  return (
    <>
      <Card>
        <h2 className="text-xl">This is my own family</h2>
        <p className="mt-2 text-ink-soft">
          Answer what you can and we will keep your place as you go. You can close this and come back whenever you
          need to.
        </p>
        <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={going !== null} onClick={() => void choose("real")}>
          {going === "real" ? "One moment…" : "Start my family's case"}
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl">Have a look around first</h2>
        <p className="mt-2 text-ink-soft">
          Walk through the whole journey with a sample family, so you can see how it works before entering anything of
          your own.
        </p>
        <Button
          variant="secondary"
          className="mt-6 w-full sm:w-auto"
          disabled={going !== null}
          onClick={() => void choose("demo")}
        >
          {going === "demo" ? "One moment…" : "Continue as a demo family"}
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl">Sign in with your phone</h2>
        <p className="mt-2 text-ink-soft">
          We will send a one-time code by SMS, so there is no password to remember.
        </p>
        <Button disabled className="mt-6 w-full sm:w-auto">
          Coming soon
        </Button>
        <p className="mt-3 text-sm text-ink-muted">
          Until this is switched on, your case is kept privately on this device and in your own browser session.
        </p>
      </Card>
    </>
  );
}
