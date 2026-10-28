import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { INTAKE_STEPS, intakeStepIndex, nextStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Card } from "@/components/ui/Card";
import { IntakeForm } from "@/components/intake/IntakeForm";

/*
  THE QUESTIONS — one per screen.

  Each question is its own URL (/intake/1, /intake/2 ...) so a family
  can close the page, or press the browser's back arrow, and land
  exactly where they left off.

  The questions themselves are listed in src/lib/journey.ts and worded
  in messages/*.json. Add one in both and it appears here, with Back
  and Continue wired up automatically.
*/

const STAGE = "/intake";

// Every question is known ahead of time, so Next.js can pre-build the
// routes. The words still come from the cookie's language at request
// time, so the pages themselves are rendered per request.
export function generateStaticParams() {
  return INTAKE_STEPS.map((step) => ({ step: step.slug }));
}

export default async function IntakeStepPage({ params }: PageProps<"/intake/[step]">) {
  const { step } = await params;
  const index = intakeStepIndex(step);

  // Someone typed /intake/99 — show the not-found page.
  if (index === -1) notFound();

  const t = await getTranslations();
  const question = INTAKE_STEPS[index];
  const previous = INTAKE_STEPS[index - 1];
  const upcoming = INTAKE_STEPS[index + 1];
  const afterQuestions = nextStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      eyebrow={t("intake.counter", { current: index + 1, total: INTAKE_STEPS.length })}
      title={t(`intake.steps.${question.slug}.question`)}
      intro={t(`intake.steps.${question.slug}.help`)}
      back={
        previous
          ? { href: `/intake/${previous.slug}`, label: t("intake.backAQuestion") }
          : { href: "/login", label: t("common.back") }
      }
      next={
        upcoming
          ? { href: `/intake/${upcoming.slug}`, label: t("common.continue") }
          : afterQuestions
            ? {
                href: afterQuestions.href,
                label: t("common.continueTo", {
                  stage: t(`stages.${afterQuestions.key}.label`),
                }),
              }
            : undefined
      }
      footnote={t("intake.footnote", { path: `/intake/${question.slug}` })}
    >
      <Card>
        <IntakeForm step={question} />
      </Card>

      {/* A way out — nobody should feel forced to answer. */}
      <p className="mt-5 text-center text-sm text-ink-muted">
        {upcoming ? t("intake.leaveBlank") : t("intake.lastQuestion")}
      </p>
    </StepPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t(`stages.${stageFor(STAGE).key}.title`) };
}
