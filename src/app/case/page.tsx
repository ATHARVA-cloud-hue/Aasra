import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CaseSummary } from "@/components/case/CaseSummary";

/*
  THE CASE TRACKER — the last step, and the page a family returns to.
  It has no "Continue". Instead it offers the ways onward: a lawyer, or
  planning ahead.

  What a family sees here is read back from what they entered. The
  fictional sample family appears only in demo mode — see CaseSummary.
*/

const STAGE = "/case";

export default async function CasePage() {
  const t = await getTranslations();
  const stage = stageFor(STAGE);
  const previous = prevStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={t(`stages.${stage.key}.title`)}
      intro={t(`stages.${stage.key}.intro`)}
      back={{
        href: previous ? previous.href : "/",
        label: t("case.backToLostMoney"),
      }}
      footnote={t("case.footnote")}
    >
      <CaseSummary />

      {/*
        The recovery estimate, offered prominently here because this is
        the page a family returns to. The number itself lives on
        /recovery with its full workings; this is the way in.
      */}
      <Card className="mt-5">
        <h2 className="text-xl">{t("case.recoveryTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("case.recoveryBody")}</p>
        <Button href="/recovery" className="mt-6 w-full sm:w-auto">
          {t("case.recoveryButton")}
        </Button>
      </Card>

      <Card className="mt-5">
        <h2 className="text-xl">{t("case.helpTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("case.helpBody")}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href="/lawyers" className="w-full sm:w-auto">
            {t("nav.talkToLawyer")}
          </Button>
          <Button href="/plan-ahead" variant="secondary" className="w-full sm:w-auto">
            {t("case.planAhead")}
          </Button>
        </div>
      </Card>
    </StepPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t(`stages.${stageFor(STAGE).key}.title`) };
}
