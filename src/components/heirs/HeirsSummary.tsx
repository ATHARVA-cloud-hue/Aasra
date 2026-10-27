"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LEGAL_LINE } from "@/lib/config";
import { CLAIM_CHECKLIST, DEMO_HEIRS, DEMO_HEIRS_WHY } from "@/lib/demo";
import { calculateHeirs, type HeirResult } from "@/lib/heirs/engine";
import type { CaseRecord } from "@/lib/caseStore";

/*
  WHO INHERITS.

  The calculation itself lives in src/lib/heirs/engine.ts. This file
  only shows the answer — and shows, just as clearly, how settled it
  is and is not.

  Two things on this screen are not decoration:

  - The "Pending lawyer verification" badge appears on every single
    computed result, without exception. There is no code path here
    that can render a heir list without it.

  - Where the engine declines to put a number on a share, we print
    "A lawyer sets this share" rather than quietly leaving a gap. A
    blank could be read as "nothing"; the words cannot.

  The sample family appears only in demo mode.
*/

type View =
  | { kind: "loading" }
  | { kind: "demo" }
  | { kind: "real"; record: CaseRecord; result: HeirResult }
  | { kind: "empty" };

export function HeirsSummary() {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, hasRealAnswers, loadCase } = await import("@/lib/caseStore");

      if (getMode() === "demo") {
        if (!cancelled) setView({ kind: "demo" });
        return;
      }

      const { record } = await loadCase();
      if (cancelled) return;

      if (!hasRealAnswers(record)) {
        setView({ kind: "empty" });
        return;
      }

      setView({ kind: "real", record, result: calculateHeirs(record) });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          Working out who the law treats as an heir…
        </p>
      </Card>
    );
  }

  return (
    <>
      {view.kind === "demo" && <DemoHeirs />}
      {view.kind === "real" && <RealHeirs result={view.result} />}
      {view.kind === "empty" && <NothingYet />}

      <Card className="mt-5">
        <h2 className="text-xl">What each place will ask you for</h2>
        <ul className="mt-4 space-y-4">
          {CLAIM_CHECKLIST.map((item) => (
            <li key={item.place}>
              <p className="text-ink">{item.place}</p>
              <p className="mt-1 text-ink-soft">{item.needs}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* The standing reminder of what we are and are not. */}
      <p className="mt-5 text-sm text-ink-muted">{LEGAL_LINE}</p>
    </>
  );
}

/* ---------------------------------------------------------------- */

function RealHeirs({ result }: { result: HeirResult }) {
  // A will means there is nothing for us to calculate.
  if (result.kind === "will") {
    return (
      <Card>
        <PendingBadge />
        <h2 className="mt-4 text-xl">There is a will, so the will decides</h2>
        <p className="mt-3 text-ink-soft">{result.summary}</p>
        {result.caution && <Caution text={result.caution} />}
      </Card>
    );
  }

  if (result.kind === "nothing") return <NothingYet />;

  const sharesShown = result.kind === "shares";

  return (
    <Card>
      <PendingBadge />

      <h2 className="mt-4 text-xl">
        {sharesShown ? "Who inherits, and how much" : "Who is likely to be an heir"}
      </h2>

      <p className="mt-2 text-sm text-ink-muted">Based on {result.law}</p>
      <p className="mt-3 text-ink-soft">{result.summary}</p>

      <ul className="mt-6 space-y-4">
        {result.heirs.map((heir) => (
          <li key={`${heir.relation}-${heir.name}`} className="border-l-2 border-sage-200 pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p>
                <span className="text-ink">{heir.name}</span>{" "}
                <span className="text-ink-muted">· {heir.relation}</span>
              </p>
              <p className={`text-sm ${heir.share ? "text-sage-800" : "text-ink-muted"}`}>
                {heir.share || "A lawyer sets this share"}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{heir.why}</p>
          </li>
        ))}
      </ul>

      {result.caution && <Caution text={result.caution} />}
    </Card>
  );
}

/*
  Shown on every computed result. Deliberately clay rather than sage:
  it is a caution, not a reassurance, and should not blend in.
*/
function PendingBadge() {
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full bg-clay-50 px-3 py-1 text-sm text-clay-700"
      role="status"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay-700" />
      Pending lawyer verification
    </p>
  );
}

function Caution({ text }: { text: string }) {
  return <p className="mt-6 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700">{text}</p>;
}

/* ---------------------------------------------------------------- */

function DemoHeirs() {
  return (
    <>
      <div className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">
        A sample result, shown with a fictional family.
      </div>

      <Card className="mt-5">
        <PendingBadge />
        <h2 className="mt-4 text-xl">Who the law treats as an heir</h2>
        <p className="mt-2 text-ink-soft">
          No will was found, so the estate is shared between the closest family in equal parts.
        </p>

        <ul className="mt-5 divide-y divide-line">
          {DEMO_HEIRS.map((heir) => (
            <li key={heir.who} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
              <span>
                <span className="text-ink">{heir.who}</span> <span className="text-ink-muted">· {heir.relation}</span>
              </span>
              <span className="text-sm text-sage-800">{heir.share}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800">{DEMO_HEIRS_WHY}</p>
      </Card>
    </>
  );
}

function NothingYet() {
  return (
    <Card>
      <h2 className="text-xl">Nothing to work out yet</h2>
      <p className="mt-3 text-ink-soft">
        Tell us about a spouse, their children, or whether their mother is living, and this page will show who the law
        treats as an heir — and what each bank or insurer will ask of them.
      </p>
    </Card>
  );
}
