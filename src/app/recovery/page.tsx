import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { AskButton } from "@/components/chat/AskButton";
import { RecoveryEstimate } from "@/components/recovery/RecoveryEstimate";
import { LandFinder } from "@/components/recovery/LandFinder";
import { REGISTRIES } from "@/lib/registries";
import {
  RBI_UNCLAIMED_DEPOSITS_CRORE,
  UNCLAIMED_DEPOSIT_YEARS,
} from "@/lib/recovery/constants";

/*
  THE RECOVERY ESTIMATE PAGE.

  Reachable from the header, the home page and the case tracker, and
  needs nothing: a family who has answered no questions still gets the
  national context and the list of places worth searching.

  The order on the page is the order of usefulness:
    1. the estimated range, with its honesty line and the full workings
    2. why this matters nationally, with the RBI figure and its source
    3. property and land, which is guided rather than estimated
    4. the official portals to actually pursue each category
*/

/*
  The four registries most relevant to a recovery, in the order a
  family should work through them. Read from REGISTRIES so this page
  can never offer a portal the finder does not have.
*/
const PURSUE = ["udgam", "epfo", "iepf", "irdai"];

export default async function RecoveryPage() {
  const t = await getTranslations();

  const pursue = PURSUE.map((id) => REGISTRIES.find((registry) => registry.id === id)).filter(
    (registry): registry is NonNullable<typeof registry> => Boolean(registry),
  );

  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">{t("recovery.title")}</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">{t("recovery.lead")}</p>
        </FadeIn>

        {/* ---------- 1. The number, and the workings ---------- */}
        <FadeIn delay={300} className="mt-10">
          <RecoveryEstimate />
        </FadeIn>

        {/* ---------- 2. Why this matters ---------- */}
        <FadeIn delay={450} className="mt-5">
          <Card>
            <h2 className="text-xl">{t("recovery.contextTitle")}</h2>

            {/*
              The national figure, with its as-on date and a link to
              the RBI accounts it was read from. Never added into the
              estimate above: it is context, not anybody's money.
            */}
            <p className="mt-3 text-ink-soft">
              {t("recovery.contextBody", {
                crore: RBI_UNCLAIMED_DEPOSITS_CRORE.value.toLocaleString("en-IN"),
                years: UNCLAIMED_DEPOSIT_YEARS.value,
              })}
            </p>

            <p className="mt-3 text-sm text-ink-muted">
              {t("recovery.contextSource")}{" "}
              <a
                href={RBI_UNCLAIMED_DEPOSITS_CRORE.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-700 underline underline-offset-4"
                lang="en"
              >
                {RBI_UNCLAIMED_DEPOSITS_CRORE.sourceName}
              </a>
            </p>
          </Card>
        </FadeIn>

        {/* ---------- 3. Property and land ---------- */}
        <FadeIn delay={600} className="mt-5">
          <LandFinder />
        </FadeIn>

        {/* ---------- 4. Where to pursue each category ---------- */}
        <FadeIn delay={750} className="mt-5">
          <Card>
            <h2 className="text-xl">{t("recovery.pursueTitle")}</h2>
            <p className="mt-2 text-ink-soft">{t("recovery.pursueBody")}</p>

            <ul className="mt-5 space-y-4">
              {pursue.map((registry) => (
                <li key={registry.id} className="border-s-2 border-sage-200 ps-4">
                  <p className="text-ink">
                    {t(`hiddenAssets.registries.${registry.id}.name`)}{" "}
                    <span className="text-ink-muted" lang="en">
                      · {registry.where}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t(`hiddenAssets.registries.${registry.id}.why`)}
                  </p>
                </li>
              ))}
            </ul>

            <Button href="/hidden-assets" className="mt-6 w-full sm:w-auto">
              {t("recovery.openPortals")}
            </Button>
          </Card>
        </FadeIn>

        <FadeIn delay={900}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/case" variant="secondary" className="w-full sm:w-auto">
              {t("recovery.backToCase")}
            </Button>
            <AskButton variant="quiet" className="w-full sm:w-auto">
              {t("recovery.askAbout")}
            </AskButton>
          </div>
        </FadeIn>

        <p className="mt-8 text-sm text-ink-muted">{t("app.legalLine")}</p>
      </Container>
    </section>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("recovery.title") };
}
