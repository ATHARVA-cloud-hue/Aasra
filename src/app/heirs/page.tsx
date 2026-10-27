import { nextStage, prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { HeirsSummary } from "@/components/heirs/HeirsSummary";

/*
  HEIR RESULT AND CHECKLIST (Stage 5 in the README).

  Worked out from the family's own intake answers. The fictional sample
  family appears only in demo mode — see HeirsSummary. Nothing here is
  ever treated as settled: a lawyer approves it before anything is filed.
*/

const STAGE = "/heirs";

export default function HeirsPage() {
  const stage = stageFor(STAGE);
  const next = nextStage(STAGE);
  const previous = prevStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={stage.title}
      intro={stage.intro}
      back={{ href: previous ? previous.href : "/", label: "Back to documents" }}
      next={next ? { href: next.href, label: "Continue" } : undefined}
      footnote="Worked out from your answers, and checked by a qualified lawyer before anything is filed."
    >
      <HeirsSummary />
    </StepPage>
  );
}

export const metadata = { title: `${stageFor(STAGE).title} — who inherits` };
