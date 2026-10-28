import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
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

  Where the religion selector on the home page lands. Not one of the
  five steps: it is a straight answer for somebody who wants one before
  committing to anything, so it has no progress strip and asks for
  nothing.

  Nothing on this page is new law. LawSummary names the Act from the
  faith alone, and HeirsSummary — the same component the /heirs step
  uses — runs the existing engine over whatever else is known and lists
  what each institution requires.

  LawSummary reads the faith from the query string, so it sits inside a
  Suspense boundary.
*/
export default async function LawPage() {
  const t = await getTranslations();

  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">{t("law.title")}</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">{t("law.lead")}</p>
        </FadeIn>

        <FadeIn delay={300} className="mt-10">
          <Suspense
            fallback={
              <Card>
                <p className="text-ink-soft">{t("law.loading")}</p>
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
            <h2 className="text-xl">{t("law.nextTitle")}</h2>
            <p className="mt-2 text-ink-soft">{t("law.nextBody")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button href={FIRST_INTAKE_HREF} className="w-full sm:w-auto">
                {t("law.startQuestions")}
              </Button>
              <Button href="/lawyers" variant="secondary" className="w-full sm:w-auto">
                {t("nav.talkToLawyer")}
              </Button>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={750}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/" variant="secondary" className="w-full sm:w-auto">
              {t("common.backToStart")}
            </Button>
            <AskButton variant="quiet" className="w-full sm:w-auto">
              {t("law.askAbout")}
            </AskButton>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("law.title") };
}
