"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FIRST_INTAKE_HREF } from "@/lib/journey";

/*
  THE TWO WAYS IN WITHOUT AN ACCOUNT — and the switch that decides
  everything downstream.

  Logging in with an email lives next door in EmailLogin. These are the
  two choices for somebody who would rather not, which has to stay
  possible: asking a person to make an account in the first hour after
  a death is the fastest way to lose them.

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
        <h2 className="text-xl">Carry on without an account</h2>
        <p className="mt-2 text-ink-soft">
          Answer what you can and we will keep your place as you go, on this device. You can close this and come back
          whenever you need to — and make an account later if you want your case on your phone too.
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
    </>
  );
}
