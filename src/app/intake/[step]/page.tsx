import { notFound } from "next/navigation";
import { INTAKE_STEPS, intakeStepIndex, nextStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Card } from "@/components/ui/Card";
import { IntakeForm } from "@/components/intake/IntakeForm";

/*
  THE INTAKE WIZARD — one question per screen.

  Each question is its own URL (/intake/1, /intake/2 ...) so a family
  can close the tab, or press the browser's back arrow, and land
  exactly where they left off.

  The questions themselves live in src/lib/journey.ts. Add one there
  and it appears here, with Back and Continue wired up automatically.
*/

const STAGE = "/intake";

// Every question is known ahead of time, so Next.js can pre-build them all.
export function generateStaticParams() {
  return INTAKE_STEPS.map((step) => ({ step: step.slug }));
}

export default async function IntakeStepPage({ params }: PageProps<"/intake/[step]">) {
  const { step } = await params;
  const index = intakeStepIndex(step);

  // Someone typed /intake/99 — show the friendly not-found page.
  if (index === -1) notFound();

  const question = INTAKE_STEPS[index];
  const previous = INTAKE_STEPS[index - 1];
  const upcoming = INTAKE_STEPS[index + 1];
  const afterWizard = nextStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      eyebrow={`Question ${index + 1} of ${INTAKE_STEPS.length}`}
      title={question.question}
      intro={question.help}
      back={
        previous
          ? { href: `/intake/${previous.slug}`, label: "Back a question" }
          : { href: "/login", label: "Back" }
      }
      next={
        upcoming
          ? { href: `/intake/${upcoming.slug}`, label: "Continue" }
          : afterWizard
            ? { href: afterWizard.href, label: `Continue to ${afterWizard.label.toLowerCase()}` }
            : undefined
      }
      footnote={`Your answers are kept as you go, and your place in the journey is held in the page address (${`/intake/${question.slug}`}) — so you can bookmark this, close it, and come back to exactly this question.`}
    >
      <Card>
        <IntakeForm step={question} />
      </Card>

      {/* A gentle way out — nobody should feel forced to answer. */}
      <p className="mt-5 text-center text-sm text-ink-muted">
        {upcoming
          ? "Not sure about something? Leave it blank and carry on."
          : "That is the last question. Thank you for staying with it."}
      </p>
    </StepPage>
  );
}

export const metadata = {
  title: `${stageFor(STAGE).title} — a few gentle questions`,
};
