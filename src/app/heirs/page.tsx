import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { nextStage, prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { HeirsSummary } from "@/components/heirs/HeirsSummary";

/*
  HEIR RESULT AND CHECKLIST.

  Worked out from the family's own answers. The fictional sample family
  appears only in demo mode — see HeirsSummary. Nothing here is ever
  treated as settled: a lawyer approves it before anything is filed.
*/

const STAGE = "/heirs";

export default async function HeirsPage() {
  const t = await getTranslations();
  const stage = stageFor(STAGE);
  const next = nextStage(STAGE);
  const previous = prevStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={t(`stages.${stage.key}.title`)}
      intro={t(`stages.${stage.key}.intro`)}
      back={{
        href: previous ? previous.href : "/",
        label: t("heirs.backToDocuments"),
      }}
      next={next ? { href: next.href, label: t("common.continue") } : undefined}
      footnote={t("heirs.footnote")}
    >
      <HeirsSummary />
    </StepPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t(`stages.${stageFor(STAGE).key}.title`) };
}
