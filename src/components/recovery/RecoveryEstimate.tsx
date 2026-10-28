"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FIRST_INTAKE_HREF } from "@/lib/journey";
import {
  estimateRecovery,
  formatRange,
  formatRupees,
  type Confidence,
  type RecoveryEstimate as Estimate,
} from "@/lib/recovery/estimate";

/*
  THE BIG NUMBER, AND THE ARITHMETIC BEHIND IT.

  Two things on this screen carry all the weight:

  1. THE HEADLINE IS A RANGE, AND SAYS WHAT IT IS. Directly under it,
     in plain words, is the sentence that keeps this honest: this is an
     estimate from what you entered, not a confirmed balance. There is
     no code path here that renders the number without that line.

  2. "HOW IS THIS CALCULATED?" OPENS EVERYTHING. Every line item, its
     range, the arithmetic in words, a confidence tag, and a link to
     the official source. Plus every assumption. If a family, or
     anybody checking this app, cannot follow the number back to a
     statute or to something the family typed, the feature has failed.

  A flagged category is shown with no rupee figure at all, not with a
  zero. "₹0" would read as "there is nothing here"; "worth checking"
  is what is actually true.
*/

type View =
  | { kind: "loading" }
  | { kind: "ready"; estimate: Estimate; demo: boolean };

export function RecoveryEstimate() {
  const t = useTranslations("recovery");
  const [view, setView] = useState<View>({ kind: "loading" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, loadAssets, loadCase } = await import("@/lib/caseStore");
      const demo = getMode() === "demo";

      /*
        In demo mode the sample family is used and the real case is
        never read, the same rule every other screen follows. A demo
        visitor must not see a real family's figures, and a real
        family must never see the sample family's.
      */
      if (demo) {
        const { DEMO_CASE } = await import("@/lib/demo");
        if (!cancelled) {
          setView({
            kind: "ready",
            demo: true,
            estimate: estimateRecovery(
              {
                ...DEMO_CASE,
                // The sample family's optional answers, so the demo
                // shows a full calculation rather than placeholders.
                employed_at_death: true,
                years_of_service: 28,
                last_monthly_salary: 32000,
                birth_year: 1958,
                property_state: "Maharashtra",
              },
              [],
            ),
          });
        }
        return;
      }

      const { record } = await loadCase();
      // Assets are a bonus: loadAssets returns an empty list rather
      // than failing, so a database problem cannot blank this page.
      const assets = await loadAssets();
      if (cancelled) return;

      setView({ kind: "ready", demo: false, estimate: estimateRecovery(record, assets) });
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

  const { estimate, demo } = view;
  const counted = estimate.lineItems.filter((item) => item.confidence !== "flag-only");
  const flagged = estimate.lineItems.filter((item) => item.confidence === "flag-only");

  return (
    <>
      {demo && (
        <div className="rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="status">
          {t("demoNotice")}
        </div>
      )}

      {/* ---------- The headline ---------- */}
      <Card className={demo ? "mt-5" : ""}>
        <p className="text-sm text-ink-muted">{t("headlineLabel")}</p>

        {estimate.nothingCounted ? (
          <>
            <h2 className="mt-2 text-2xl sm:text-3xl">{t("nothingCountedTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("nothingCountedBody")}</p>
            <Button href={FIRST_INTAKE_HREF} className="mt-6 w-full sm:w-auto">
              {t("answerQuestions")}
            </Button>
          </>
        ) : (
          <>
            {/*
              rtl-isolate keeps the two figures and the dash in the
              right order when the page is laid out right to left.
            */}
            <p className="rtl-isolate mt-2 font-serif text-3xl leading-tight text-sage-800 sm:text-4xl">
              {formatRange(estimate.headline.low, estimate.headline.high)}
            </p>

            {/* The honest label. Never rendered apart from the number. */}
            <p className="mt-4 text-ink-soft">{t("headlineHonesty")}</p>
          </>
        )}

        <button
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-expanded={open}
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-sage-200 bg-paper px-5 py-2.5 text-base text-sage-800 transition-colors hover:border-sage-400 hover:bg-sage-50"
        >
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
          {t("howCalculated")}
        </button>

        {open && (
          <div className="mt-6 border-t border-line pt-6">
            <Workings estimate={estimate} />
          </div>
        )}
      </Card>

      {/* ---------- What was counted ---------- */}
      {counted.length > 0 && (
        <Card className="mt-5">
          <h2 className="text-xl">{t("countedTitle")}</h2>
          <ul className="mt-5 divide-y divide-line">
            {counted.map((item) => (
              <li key={item.categoryKey} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="text-ink">{t(`categories.${item.categoryKey}`)}</span>
                <span className="rtl-isolate text-sage-800">{formatRange(item.low, item.high)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Worth checking ---------- */}
      {flagged.length > 0 && (
        <Card className="mt-5">
          <h2 className="text-xl">{t("flaggedTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("flaggedBody")}</p>
          <ul className="mt-5 space-y-4">
            {flagged.map((item) => (
              <li key={item.categoryKey} className="border-s-2 border-sage-200 ps-4">
                <p className="text-ink">{t(`categories.${item.categoryKey}`)}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {t(`basis.${item.basisKey}`, item.basisValues)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );

  /* ---------------------------------------------------------------- */

  /** The trust-builder: every line item and every assumption. */
  function Workings({ estimate }: { estimate: Estimate }) {
    return (
      <>
        <h3 className="text-lg">{t("workingsTitle")}</h3>
        <p className="mt-2 text-sm text-ink-soft">{t("workingsIntro")}</p>

        <ul className="mt-5 space-y-5">
          {estimate.lineItems.map((item) => (
            <li key={item.categoryKey} className="rounded-2xl bg-cream px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-ink">{t(`categories.${item.categoryKey}`)}</p>
                <p className="rtl-isolate text-sm text-sage-800">
                  {item.confidence === "flag-only"
                    ? t("worthChecking")
                    : formatRange(item.low, item.high)}
                </p>
              </div>

              <p className="mt-2 text-sm text-ink-soft">
                {t(`basis.${item.basisKey}`, item.basisValues)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <ConfidenceTag confidence={item.confidence} />

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sage-700 underline underline-offset-4"
                  >
                    {item.sourceName ?? t("source")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-lg">{t("assumptionsTitle")}</h3>
        <ul className="mt-3 space-y-2">
          {estimate.assumptions.map((assumption) => (
            <li key={assumption.key} className="flex gap-3 text-sm text-ink-soft">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
              <span>{t(`assumptions.${assumption.key}`, assumption.values)}</span>
            </li>
          ))}
        </ul>

        {estimate.notes.length > 0 && (
          <ul className="mt-5 space-y-2">
            {estimate.notes.map((note) => (
              <li
                key={note.key}
                className="rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700"
              >
                {t(`notes.${note.key}`, note.values)}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-sm text-ink-muted">{t("workingsFootnote")}</p>
      </>
    );
  }

  /*
    The confidence tag. Four words, and they mean different things:
    "reported" is a figure the family gave, "statutory" comes from an
    Act, "estimated" is our arithmetic, "worth checking" is a job to
    do with no number attached.
  */
  function ConfidenceTag({ confidence }: { confidence: Confidence }) {
    const tone =
      confidence === "reported" || confidence === "statutory"
        ? "bg-sage-100 text-sage-800"
        : confidence === "estimated"
          ? "bg-sage-50 text-sage-800"
          : "bg-clay-50 text-clay-700";

    return (
      <span className={`rounded-full px-3 py-1 text-sm ${tone}`}>
        {t(`confidence.${confidence}`)}
      </span>
    );
  }
}

/** Exported so the /case card can show the same range without the panel. */
export function useFormattedRupees() {
  return { formatRupees, formatRange };
}
