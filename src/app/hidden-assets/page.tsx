import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { nextStage, prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { RegistryList } from "@/components/hidden-assets/RegistryList";

/*
  THE HIDDEN ASSET FINDER.

  The official registries most families never think to check, each with
  a link to the real government site and a place to report what was
  found. The family runs each search themselves — see the note in
  src/lib/registries.ts for why that is deliberate, not a shortcut.
*/

const STAGE = "/hidden-assets";

export default async function HiddenAssetsPage() {
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
        label: t("hiddenAssets.backToHeirs"),
      }}
      next={
        next
          ? {
              href: next.href,
              label: t("common.continueTo", { stage: t(`stages.${next.key}.label`) }),
            }
          : undefined
      }
      footnote={t("hiddenAssets.footnote")}
    >
      <RegistryList />
    </StepPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t(`stages.${stageFor(STAGE).key}.title`) };
}
