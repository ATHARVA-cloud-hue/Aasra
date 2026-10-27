"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RELIGIONS } from "@/lib/journey";
import { lawForReligion, type ApplicableLaw } from "@/lib/heirs/engine";

/*
  WHAT THE LAW SAYS FOR YOUR FAMILY — the top half of /law.

  It names the Act that applies and explains it in two or three
  sentences. The heirs, the shares and the document checklist below it
  come from HeirsSummary, which was already doing exactly that job and
  is left alone.

  Where the faith comes from, in order:

  1. The URL (?faith=muslim), set by the selector that sent them here.
     This is what makes the page honest in demo mode, where nothing is
     written down.
  2. The saved case, for somebody who answered question five of the
     wizard weeks ago and has come back to this page directly.

  If neither has an answer, the page says so plainly and offers the
  question rather than guessing.
*/

type View =
  | { kind: "loading" }
  | { kind: "ready"; faith: string | null; law: ApplicableLaw; demo: boolean };

export function LawSummary() {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("faith");

  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, loadCase } = await import("@/lib/caseStore");
      const demo = getMode() === "demo";

      if (fromUrl) {
        if (!cancelled) setView({ kind: "ready", faith: fromUrl, law: lawForReligion(fromUrl), demo });
        return;
      }

      // In demo mode we name the sample family's own faith rather than
      // reading a real case we must not touch.
      if (demo) {
        const { DEMO_CASE } = await import("@/lib/demo");
        const faith = DEMO_CASE.religion ?? null;
        if (!cancelled) setView({ kind: "ready", faith, law: lawForReligion(faith), demo });
        return;
      }

      const { record } = await loadCase();
      if (cancelled) return;

      const faith = record.religion ?? null;
      setView({ kind: "ready", faith, law: lawForReligion(faith), demo });
    })();

    return () => {
      cancelled = true;
    };
  }, [fromUrl]);

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          Working out which law applies…
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-ink-muted">{faithLabel(view.faith)}</p>
      <h2 className="mt-2 text-xl">{view.law.law}</h2>
      <p className="mt-3 text-ink-soft">{view.law.note}</p>

      {/*
        In demo mode the heirs and shares underneath belong to the
        sample family, who are Hindu — so if a visitor has just chosen
        a different faith, this card and the one below it would appear
        to contradict each other. Said plainly rather than hidden: the
        alternative is a page that looks wrong for no visible reason.
      */}
      {view.demo && (
        <p className="mt-5 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700">
          You are exploring as a sample family — a Hindu family from Pune. The law above is the one you just chose,
          but the names and shares below are theirs. Start your own case to see this worked out for your family.
        </p>
      )}
    </Card>
  );
}

/*
  The stored value is a slug ("christian"); the family chose a word
  ("Christian"). Show them their own word back. Anything unrecognised —
  an older case, a value from a list that has since changed — falls
  back to a neutral line rather than printing a slug at somebody.
*/
function faithLabel(faith: string | null): string {
  if (!faith) return "We do not know their faith yet";

  const match = RELIGIONS.find((option) => option.value === faith.trim().toLowerCase());
  if (!match) return "Based on the faith you told us";
  if (match.value === "private") return "You would rather not say";

  return `Because they were ${match.label}`;
}
