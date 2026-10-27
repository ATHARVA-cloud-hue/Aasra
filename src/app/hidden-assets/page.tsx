import { nextStage, prevStage, stageFor } from "@/lib/journey";
import { StepPage } from "@/components/layout/StepPage";
import { RegistryList } from "@/components/hidden-assets/RegistryList";

/*
  HIDDEN ASSET FINDER (Stage 6 in the README).

  The official registries most families never think to check, each with
  a link to the real government site and a place to report what was
  found. The family runs each search themselves — see the note in
  src/lib/registries.ts for why that is deliberate, not a shortcut.
*/

const STAGE = "/hidden-assets";

export default function HiddenAssetsPage() {
  const stage = stageFor(STAGE);
  const next = nextStage(STAGE);
  const previous = prevStage(STAGE);

  return (
    <StepPage
      stage={STAGE}
      title={stage.title}
      intro={stage.intro}
      back={{ href: previous ? previous.href : "/", label: "Back to who inherits" }}
      next={next ? { href: next.href, label: `Continue to ${next.label.toLowerCase()}` } : undefined}
      footnote="You can do these searches in any order, or skip them and come back. Anything you find is added to your case so you never have to remember it twice."
    >
      <RegistryList />
    </StepPage>
  );
}

export const metadata = { title: `${stageFor(STAGE).title} — the hidden asset finder` };
