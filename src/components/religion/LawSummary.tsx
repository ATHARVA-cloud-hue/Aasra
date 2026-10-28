"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RELIGION_VALUES } from "@/lib/journey";
import { lawForReligion, type ApplicableLaw } from "@/lib/heirs/engine";

/*
  WHAT THE LAW SAYS FOR YOUR FAMILY — the top half of /law.

  It names the Act that applies and explains it in two or three
  sentences. The heirs, the shares and the document checklist below it
  come from HeirsSummary, which was already doing exactly that job.

  Where the faith comes from, in order:

  1. The URL (?faith=muslim), set by the selector that led here. This
     is what makes the page honest in demo mode, where nothing is
     written down.
  2. The saved case, for somebody who answered question five weeks ago
     and has returned to this page directly.

  If neither has an answer, the page says so plainly and offers the
  question rather than guessing.
*/

type View =
  | { kind: "loading" }
  | { kind: "ready"; faith: string | null; law: ApplicableLaw; demo: boolean };

export function LawSummary() {
  const t = useTranslations("law");
  const tReligion = useTranslations("religion.options");

  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("faith");

  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, loadCase } = await import("@/lib/caseStore");
      const demo = getMode() === "demo";

      if (fromUrl) {
        if (!cancelled) {
          setView({ kind: "ready", faith: fromUrl, law: lawForReligion(fromUrl), demo });
        }
        return;
      }

      // In demo mode the sample family's own faith is named, rather
      // than reading a real case that must not be touched.
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
          {t("loading")}
        </p>
      </Card>
    );
  }

  /*
    The stored value is a slug ("christian"); the family chose a word
    ("Christian"). Show their own word back, in the language they are
    reading. Anything unrecognised, from an older case or a list that
    has since changed, falls back to a neutral line rather than
    printing a slug at somebody.
  */
  const faith = view.faith?.trim().toLowerCase();

  const because = !faith
    ? t("becauseUnknown")
    : faith === "private"
      ? t("becausePrivate")
      : RELIGION_VALUES.includes(faith)
        ? t("because", { faith: tReligion(faith) })
        : t("becauseGeneric");

  return (
    <Card>
      <p className="text-sm text-ink-muted">{because}</p>
      <h2 className="mt-2 text-xl">{t(`acts.${view.law.actKey}`)}</h2>
      <p className="mt-3 text-ink-soft">{t(`notes.${view.law.noteKey}`)}</p>

      {/*
        In demo mode the heirs and shares underneath belong to the
        sample family, who are Hindu. If a visitor has just chosen a
        different faith, this card and the one below it would appear to
        contradict each other. Said plainly rather than hidden: the
        alternative is a page that looks wrong for no visible reason.
      */}
      {view.demo && (
        <p className="mt-5 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {t("demoNote")}
        </p>
      )}
    </Card>
  );
}
