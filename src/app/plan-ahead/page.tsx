import { whatsappLink } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";

/*
  "Plan ahead" — for people who have not lost anyone, and want to
  spare their family the search later. Still a coming-soon page, but
  it now offers a way onward instead of only a way back.
*/

const willInclude = [
  "A simple list of your accounts, policies and nominees.",
  "A nudge when a nominee is missing — the single biggest cause of delay.",
  "One sealed summary your family can open when they need it.",
];

export default function PlanAheadPage() {
  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">Planning ahead is coming soon</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">
            Soon you will be able to leave your family a clear list, so they never have to search. For now we are
            focused on families who have just lost someone.
          </p>
        </FadeIn>

        <FadeIn delay={300} className="mt-8">
          <Card>
            <h2 className="text-xl">What it will include</h2>
            <ul className="mt-4 space-y-3">
              {willInclude.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400" />
                  <span className="text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={450} className="mt-8">
          <Card>
            <h2 className="text-xl">If you have already lost someone</h2>
            <p className="mt-2 text-ink-soft">
              Then start here instead, and we will walk the whole way with you.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href="/login" className="w-full sm:w-auto">
                Start here
              </Button>
              <Button
                href={whatsappLink()}
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                Talk to a person
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={600}>
          <Button href="/" variant="quiet" className="mt-8">
            Back to the start
          </Button>
        </FadeIn>
      </Container>
    </section>
  );
}
