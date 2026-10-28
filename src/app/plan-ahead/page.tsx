import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";

/*
  "Plan ahead" — for people who have not lost anyone and want to spare
  their family the search later. Still a coming-soon page, but it
  offers a way onward as well as a way back.
*/

/** Keys under planAhead.include. */
const INCLUDE = ["list", "nominee", "sealed"];

export default async function PlanAheadPage() {
  const t = await getTranslations();

  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">{t("planAhead.title")}</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">{t("planAhead.lead")}</p>
        </FadeIn>

        <FadeIn delay={300} className="mt-8">
          <Card>
            <h2 className="text-xl">{t("planAhead.includeTitle")}</h2>
            <ul className="mt-4 space-y-3">
              {INCLUDE.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage-400"
                  />
                  <span className="text-ink-soft">{t(`planAhead.include.${item}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={450} className="mt-8">
          <Card>
            <h2 className="text-xl">{t("planAhead.alreadyTitle")}</h2>
            <p className="mt-2 text-ink-soft">{t("planAhead.alreadyBody")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href="/login" className="w-full sm:w-auto">
                {t("planAhead.startHere")}
              </Button>
              <Button href="/lawyers" variant="secondary" className="w-full sm:w-auto">
                {t("nav.talkToLawyer")}
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={600}>
          <Button href="/" variant="quiet" className="mt-8">
            {t("common.backToStart")}
          </Button>
        </FadeIn>
      </Container>
    </section>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("planAhead.title") };
}
