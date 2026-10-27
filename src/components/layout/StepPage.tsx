import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { JourneyProgress } from "@/components/layout/JourneyProgress";

/*
  The shared shape of every page inside the journey:
  progress strip → heading → a calm sentence → the page's own content
  → a Back button and a Continue button.

  Pages pass in where Back and Continue point, so the wiring lives in
  one place and every screen behaves the same way.
*/

export type StepLink = { href: string; label: string };

export function StepPage({
  stage,
  eyebrow,
  title,
  intro,
  children,
  back,
  next,
  footnote,
}: {
  /** The stage href this page belongs to, e.g. "/documents". */
  stage: string;
  /** Small line above the heading, e.g. "Question 2 of 4". */
  eyebrow?: string;
  title: string;
  intro: string;
  children?: ReactNode;
  back: StepLink;
  /** Leave out on the last page of the journey. */
  next?: StepLink;
  footnote?: string;
}) {
  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <JourneyProgress current={stage} />

        <FadeIn className="mt-12">
          {eyebrow && <p className="text-sm text-ink-muted">{eyebrow}</p>}
          <h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">{intro}</p>
        </FadeIn>

        {children && (
          <FadeIn delay={300} className="mt-8">
            {children}
          </FadeIn>
        )}

        <FadeIn delay={450}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href={back.href} variant="secondary" className="w-full sm:w-auto">
              {back.label}
            </Button>
            {next && (
              <Button href={next.href} size="lg" className="w-full sm:w-auto">
                {next.label}
              </Button>
            )}
          </div>
        </FadeIn>

        {footnote && <p className="mt-8 text-sm text-ink-muted">{footnote}</p>}
      </Container>
    </section>
  );
}
