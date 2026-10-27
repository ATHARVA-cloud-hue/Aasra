import { prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CaseSummary } from "@/components/case/CaseSummary";

/*
  CASE TRACKER (Stage 7 in the README) — the last stage, and the page
  a family comes back to. It has no "Continue": instead it offers the
  quiet ways onward — a real person, or planning ahead.

  What a family sees here is read back from what they entered. The
  fictional sample family appears only in demo mode — see CaseSummary.
*/

const STAGE = "/case";

export default function CasePage() {
  const stage = stageFor(STAGE);
  const previous = prevStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={stage.title}
      intro={stage.intro}
      back={{ href: previous ? previous.href : "/", label: "Back to lost money" }}
      footnote="Come back here any time to see where things stand. We will only ask for you when something genuinely needs you."
    >
      <CaseSummary />

      <Card className="mt-5">
        <h2 className="text-xl">Whenever you need us</h2>
        <p className="mt-2 text-ink-soft">
          One of us can pick up where this page leaves off — no need to explain everything again.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href="/lawyers" className="w-full sm:w-auto">
            Talk to a lawyer
          </Button>
          <Button href="/plan-ahead" variant="secondary" className="w-full sm:w-auto">
            Plan ahead for my own family
          </Button>
        </div>
      </Card>
    </StepPage>
  );
}

export const metadata = { title: `${stageFor(STAGE).title} — your case tracker` };
