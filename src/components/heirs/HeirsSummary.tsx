"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CLAIM_CHECKLIST, DEMO_HEIRS } from "@/lib/demo";
import { calculateHeirs, type Fraction, type HeirResult } from "@/lib/heirs/engine";

/*
  WHO INHERITS.

  The calculation itself is in src/lib/heirs/engine.ts. This file only
  shows the answer, and shows just as clearly how settled it is and is
  not.

  Two things on this screen are not decoration:

  - The "Pending lawyer verification" badge appears on every single
    computed result, without exception. There is no code path here that
    can render an heir list without it.

  - Where the engine declines to put a number on a share, this prints
    "A lawyer sets this share" rather than quietly leaving a gap. A
    blank could be read as "nothing"; the words cannot.

  The engine returns message keys rather than sentences, so that the
  same result reads correctly in five languages. The lookups happen
  here.

  The sample family appears only in demo mode.
*/

type View =
  | { kind: "loading" }
  | { kind: "demo" }
  | { kind: "real"; result: HeirResult }
  | { kind: "empty" };

export function HeirsSummary() {
  const t = useTranslations("heirs");
  const tLaw = useTranslations("law.acts");
  const tDemo = useTranslations("demo");

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

      setView({ kind: "real", result: calculateHeirs(record) });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          {t("loading")}
        </p>
      </Card>
    );
  }

  /** "1/3 of the estate", or "The whole estate" when there is one heir. */
  function shareWords(share: Fraction | undefined): string {
    if (!share) return t("share.lawyerSets");
    if (share.bottom === 1) return t("share.whole");
    return t("share.fraction", { top: share.top, bottom: share.bottom });
  }

  return (
    <>
      {view.kind === "demo" && <DemoHeirs />}
      {view.kind === "real" && <RealHeirs result={view.result} />}
      {view.kind === "empty" && <NothingYet />}

      <Card className="mt-5">
        <h2 className="text-xl">{t("checklistTitle")}</h2>
        <ul className="mt-4 space-y-4">
          {CLAIM_CHECKLIST.map((item) => (
            <li key={item}>
              <p className="text-ink">{tDemo(`checklist.${item}.place`)}</p>
              <p className="mt-1 text-ink-soft">{tDemo(`checklist.${item}.needs`)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );

  /* ---------------------------------------------------------------- */

  function RealHeirs({ result }: { result: HeirResult }) {
    const law = tLaw(result.lawKey);

    // A will means there is nothing to calculate.
    if (result.kind === "will") {
      return (
        <Card>
          <PendingBadge />
          <h2 className="mt-4 text-xl">{t("titleWill")}</h2>
          <p className="mt-3 text-ink-soft">{t(`summary.${result.summaryKey}`)}</p>
          {result.cautionKey && <Caution text={t(`caution.${result.cautionKey}`)} />}
        </Card>
      );
    }

    if (result.kind === "nothing") return <NothingYet />;

    const sharesShown = result.kind === "shares";

    return (
      <Card>
        <PendingBadge />

        <h2 className="mt-4 text-xl">
          {sharesShown ? t("titleWithShares") : t("titleNamesOnly")}
        </h2>

        <p className="mt-2 text-sm text-ink-muted">{t("basedOn", { law })}</p>
        <p className="mt-3 text-ink-soft">
          {t(`summary.${result.summaryKey}`, result.summaryValues)}
        </p>

        <ul className="mt-6 space-y-4">
          {result.heirs.map((heir, index) => {
            const relation = t(`relations.${heir.relationKey}`);

            return (
              <li
                key={`${heir.relationKey}-${heir.name}-${index}`}
                /*
                  border-s rather than border-l: the marker has to sit
                  on the reading edge, which is the right-hand side in
                  Urdu.
                */
                className="border-s-2 border-sage-200 ps-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p>
                    {/* An unnamed mother is described rather than left blank. */}
                    <span className="text-ink">{heir.name || t("theMother")}</span>{" "}
                    <span className="text-ink-muted">· {relation}</span>
                  </p>
                  <p
                    className={`rtl-isolate text-sm ${heir.share ? "text-sage-800" : "text-ink-muted"}`}
                  >
                    {shareWords(heir.share)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {t(`why.${heir.whyKey}`, { relation, law, ...heir.whyValues })}
                </p>
              </li>
            );
          })}
        </ul>

        {result.cautionKey && <Caution text={t(`caution.${result.cautionKey}`)} />}
      </Card>
    );
  }

  function NothingYet() {
    return (
      <Card>
        <h2 className="text-xl">{t("nothingTitle")}</h2>
        <p className="mt-3 text-ink-soft">{t("nothingBody")}</p>
      </Card>
    );
  }

  /* The sample family — only ever reached in demo mode. */
  function DemoHeirs() {
    return (
      <>
        <div className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">
          {t("demoNotice")}
        </div>

        <Card className="mt-5">
          <PendingBadge />
          <h2 className="mt-4 text-xl">{t("demoTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("demoBody")}</p>

          <ul className="mt-5 divide-y divide-line">
            {DEMO_HEIRS.map((heir) => (
              <li
                key={heir.who}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
              >
                <span>
                  <span className="text-ink">{heir.who}</span>{" "}
                  <span className="text-ink-muted">· {tDemo(`heirRelations.${heir.relation}`)}</span>
                </span>
                <span className="text-sm text-sage-800">{tDemo("equalShare")}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800">
            {t("demoWhy")}
          </p>
        </Card>
      </>
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
        {t("pendingBadge")}
      </p>
    );
  }
}

function Caution({ text }: { text: string }) {
  return <p className="mt-6 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700">{text}</p>;
}
