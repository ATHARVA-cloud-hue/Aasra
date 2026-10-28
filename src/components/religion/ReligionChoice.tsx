"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { RELIGION_VALUES } from "@/lib/journey";

/*
  WHICH LAW APPLIES — the short way in.

  The same question is already question five. It is offered here too
  because it is the one answer that changes everything downstream, and
  somebody standing in a bank queue should be able to get a straight
  answer to "how is this divided?" without first entering a name and a
  date of death.

  Choosing a faith saves it against the case, in the same `religion`
  field question five writes, and goes to /law, which runs the existing
  heirs engine over whatever is known so far.

  Two things it is careful about:

  - In demo mode nothing is written down, for the same reason the
    questions are not: a visitor clicking around must never overwrite a
    real family's saved answer. The choice still travels to /law, in
    the URL, so the demo genuinely works.

  - The choice travels in the URL in real mode too. The save is a
    background nicety; the page that follows does not wait on it, and
    is right even if the save never lands.
*/

export function ReligionChoice() {
  const t = useTranslations("religion");
  const router = useRouter();
  const [going, setGoing] = useState<string | null>(null);

  async function choose(value: string) {
    setGoing(value);

    // Loaded here rather than at the top of the file, so the home page
    // does not pull in the database library to draw nine buttons.
    const { getMode, saveCase } = await import("@/lib/caseStore");

    if (getMode() !== "demo") {
      await saveCase({ religion: value });
    }

    router.push(`/law?faith=${encodeURIComponent(value)}`);
  }

  return (
    <Card>
      <h2 className="text-xl">{t("title")}</h2>
      <p className="mt-2 text-ink-soft">{t("body")}</p>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="sr-only">{t("legend")}</legend>
        <div className="flex flex-wrap gap-2">
          {RELIGION_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={going !== null}
              onClick={() => void choose(value)}
              className={
                "min-h-12 rounded-2xl border px-4 py-2.5 text-base transition-colors duration-200 " +
                "disabled:cursor-not-allowed " +
                (going === value
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50 disabled:opacity-50")
              }
            >
              {going === value ? t("oneMoment") : t(`options.${value}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-5 text-sm text-ink-muted">{t("note")}</p>
    </Card>
  );
}
