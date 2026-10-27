import { Suspense } from "react";
import { FIRST_INTAKE_HREF } from "@/lib/journey";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { LawSummary } from "@/components/religion/LawSummary";
import { HeirsSummary } from "@/components/heirs/HeirsSummary";
import { AskButton } from "@/components/chat/AskButton";

/*
  WHAT THE LAW SAYS FOR YOUR FAMILY.

  Where the religion selector on the landing page lands. Not a stage of
  the journey — it is a straight answer for somebody who wants one
  before committing to anything, so it has no progress strip and asks
  for nothing.

  Nothing on this page is new law. LawSummary names the Act from the
  faith alone, and HeirsSummary — unchanged, the same component the
  /heirs stage uses — runs the existing engine over whatever else we
  know and lists what each institution will ask for.

  LawSummary reads the faith from the query string, so it sits inside a
  Suspense boundary; the rest of the page is static.
*/
export default function LawPage() {
  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">What the law says for your family</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">
            Which law applies, who it treats as an heir, and the papers each bank or office will ask you for. Nothing
            here is settled until a lawyer has read it.
          </p>
        </FadeIn>

        <FadeIn delay={300} className="mt-10">
          <Suspense
            fallback={
              <Card>
                <p className="text-ink-soft">Working out which law applies…</p>
              </Card>
            }
          >
            <LawSummary />
          </Suspense>
        </FadeIn>

        <FadeIn delay={450} className="mt-5">
          <HeirsSummary />
        </FadeIn>

        <FadeIn delay={600} className="mt-10">
          <Card>
            <h2 className="text-xl">Want the shares worked out properly?</h2>
            <p className="mt-2 text-ink-soft">
              Tell us a little about the family — a spouse, the children, whether their mother is living — and this
              page fills itself in with real names and real shares.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={FIRST_INTAKE_HREF} className="w-full sm:w-auto">
                Start with a few gentle questions
              </Button>
              <Button href="/lawyers" variant="secondary" className="w-full sm:w-auto">
                Talk to a lawyer
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={750}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/" variant="secondary" className="w-full sm:w-auto">
              Back to the start
            </Button>
            <AskButton variant="quiet" className="w-full sm:w-auto">
              Ask a question about this
            </AskButton>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

export const metadata = { title: "What the law says for your family" };
