"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { RELIGIONS } from "@/lib/journey";

/*
  WHICH LAW APPLIES TO YOUR FAMILY — the short way in.

  The same question is already question five of the wizard. It is
  offered here too because it is the one answer that changes everything
  downstream, and a family standing in a bank queue should be able to
  get a straight answer to "how is this divided?" without first telling
  us their father's name and date of death.

  Picking a faith saves it against the case — the same `religion` field
  the wizard writes — and goes to /law, which runs the existing heirs
  engine over whatever we know so far.

  Two things it is careful about:

  - In demo mode nothing is written down, for the same reason the
    wizard does not: a visitor clicking around must never overwrite a
    real family's saved answer. The choice still travels to /law, in
    the URL, so the demo genuinely works.

  - The choice also travels in the URL in real mode. The save is a
    background nicety; the page that follows does not wait on it, and
    is right even if the save never lands.
*/

export function ReligionChoice() {
  const router = useRouter();
  const [going, setGoing] = useState<string | null>(null);

  async function choose(value: string) {
    setGoing(value);

    // Loaded here rather than at the top of the file, so the landing
    // page does not pull in the database library to draw nine buttons.
    const { getMode, saveCase } = await import("@/lib/caseStore");

    if (getMode() !== "demo") {
      // Deliberately not awaited beyond this call: /law reads the faith
      // from the URL, so a slow or failed save cannot hold anyone up.
      await saveCase({ religion: value });
    }

    router.push(`/law?faith=${encodeURIComponent(value)}`);
  }

  return (
    <Card>
      <h2 className="text-xl">Which faith did they follow?</h2>
      <p className="mt-2 text-ink-soft">
        In India this is the one answer that decides how an estate is divided — a Hindu family and a Christian family
        divide one differently. Choose, and we will show you what the law says for your family.
      </p>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="sr-only">Their faith</legend>
        <div className="flex flex-wrap gap-2">
          {RELIGIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={going !== null}
              onClick={() => void choose(option.value)}
              className={
                "min-h-12 rounded-2xl border px-4 py-2.5 text-base transition-colors duration-200 " +
                "disabled:cursor-not-allowed " +
                (going === option.value
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50 disabled:opacity-50")
              }
            >
              {going === option.value ? "One moment…" : option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-5 text-sm text-ink-muted">
        We ask only because the law requires it, and your answer stays private. &ldquo;Prefer not to say&rdquo; is a
        real answer — we fall back to the rules every one of India&apos;s succession laws shares.
      </p>
    </Card>
  );
}
