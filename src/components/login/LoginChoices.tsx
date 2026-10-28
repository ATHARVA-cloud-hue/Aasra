"use client";

import { useTranslations } from "next-intl";
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

  - "Continue as a demo family" sets demo. Sample families are shown on
    purpose, and nothing entered is treated as real.
  - "Start my family's claim" sets real. Sample data is never shown
    again, and answers are saved as a genuine case.

  Real is the safer default: if somebody arrives straight at a question
  without passing through here, they are treated as a real family and
  never shown somebody else's name as if it were their own.
*/

export function LoginChoices() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");

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
        <h2 className="text-xl">{t("noAccountTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("noAccountBody")}</p>
        <Button
          size="lg"
          className="mt-6 w-full sm:w-auto"
          disabled={going !== null}
          onClick={() => void choose("real")}
        >
          {going === "real" ? tCommon("oneMoment") : t("noAccountButton")}
        </Button>
      </Card>

      <Card>
        <h2 className="text-xl">{t("demoTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("demoBody")}</p>
        <Button
          variant="secondary"
          className="mt-6 w-full sm:w-auto"
          disabled={going !== null}
          onClick={() => void choose("demo")}
        >
          {going === "demo" ? tCommon("oneMoment") : t("demoButton")}
        </Button>
      </Card>
    </>
  );
}
