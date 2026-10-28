import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { AskButton } from "@/components/chat/AskButton";
import { ReligionChoice } from "@/components/religion/ReligionChoice";
import { REGISTRIES } from "@/lib/registries";

/*
  THE HOME PAGE.

  One clear action at the top: start a claim. Below it, the three things
  somebody might want before committing to anything: ask a question,
  find out which law applies, or search the government portals.
*/

/** Keys under home.steps, in order. */
const STEPS = ["one", "two", "three"];

/** Keys under home.situations. */
const SITUATIONS = ["noWill", "unknownAssets", "abroad", "firstTime", "business"];

/*
  The portal names are read off the registry list rather than typed out
  again, so this page can never promise a portal the finder does not
  have. They are institution names, so they are not translated.
*/
const PORTALS = REGISTRIES.map((registry) => registry.where);

export default async function Home() {
  const t = await getTranslations("home");
  // The recovery card belongs to its own namespace, not to "home".
  const tRecovery = await getTranslations("recovery");

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="pb-20 pt-10 sm:pt-20">
        <Container width="narrow" className="text-center">
          <FadeIn>
            <p className="text-base text-ink-muted">{t("condolence")}</p>
          </FadeIn>

          <FadeIn delay={150}>
            <h1 className="mt-5 text-4xl sm:text-5xl">{t("title")}</h1>
          </FadeIn>

          <FadeIn delay={300}>
            <p className="mt-6 text-lg text-ink-soft">{t("lead")}</p>
          </FadeIn>

          <FadeIn delay={450} className="mt-10 flex flex-col items-center gap-4">
            <Button href="/login" size="lg" className="w-full sm:w-auto">
              {t("startClaim")}
            </Button>
            <Button href="/plan-ahead" variant="secondary" className="w-full sm:w-auto">
              {t("planAhead")}
            </Button>
          </FadeIn>

          <FadeIn delay={600}>
            <p className="mt-6 text-sm text-ink-muted">{t("reassurance")}</p>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- A question, right now ---------- */}
      <section className="pb-8">
        <Container width="narrow">
          <FadeIn>
            <Card className="text-center">
              <h2 className="text-xl">{t("ask.title")}</h2>
              <p className="mt-2 text-ink-soft">{t("ask.body")}</p>
              <AskButton className="mt-6 w-full sm:w-auto">{t("ask.button")}</AskButton>
            </Card>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- The recovery estimate ---------- */}
      <section className="py-10">
        <Container width="narrow">
          <FadeIn>
            <Card>
              <h2 className="text-xl">{tRecovery("title")}</h2>
              <p className="mt-2 text-ink-soft">{tRecovery("homeBody")}</p>
              <Button href="/recovery" className="mt-6 w-full sm:w-auto">
                {tRecovery("homeButton")}
              </Button>
              <p className="mt-4 text-sm text-ink-muted">{tRecovery("homeHonesty")}</p>
            </Card>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- Which law applies ---------- */}
      <section className="py-10">
        <Container width="narrow">
          <FadeIn>
            <ReligionChoice />
          </FadeIn>
        </Container>
      </section>

      {/* ---------- The official searches ---------- */}
      <section className="py-10">
        <Container width="narrow">
          <FadeIn>
            <Card>
              <h2 className="text-xl">{t("portals.title")}</h2>
              <p className="mt-2 text-ink-soft">{t("portals.body")}</p>

              <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("portals.listLabel")}>
                {PORTALS.map((portal) => (
                  <li
                    key={portal}
                    lang="en"
                    className="rounded-full bg-sage-50 px-3 py-1 text-sm text-sage-800"
                  >
                    {portal}
                  </li>
                ))}
              </ul>

              <Button href="/hidden-assets" className="mt-6 w-full sm:w-auto">
                {t("portals.button")}
              </Button>

              <p className="mt-4 text-sm text-ink-muted">{t("portals.safety")}</p>
            </Card>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl">{t("howTitle")}</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step}>
                <Card className="h-full">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 font-serif text-lg text-sage-800">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl">{t(`steps.${step}.title`)}</h3>
                  <p className="mt-2 text-ink-soft">{t(`steps.${step}.body`)}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- What the app does, and what lawyers do ---------- */}
      <section className="py-16">
        <Container width="narrow" className="text-center">
          <blockquote className="font-serif text-2xl leading-snug text-ink sm:text-3xl">
            {t("principle.quote")}
          </blockquote>
          <p className="mt-5 text-ink-soft">{t("principle.note")}</p>
        </Container>
      </section>

      {/* ---------- Common situations ---------- */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl">{t("situationsTitle")}</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SITUATIONS.map((item) => (
              <li key={item}>
                <Card className="h-full">
                  <h3 className="text-xl">{t(`situations.${item}.title`)}</h3>
                  <p className="mt-2 text-ink-soft">{t(`situations.${item}.body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------- Closing ---------- */}
      <section className="py-16">
        <Container width="narrow" className="text-center">
          <h2 className="text-3xl">{t("closing.title")}</h2>
          <p className="mt-4 text-ink-soft">{t("closing.body")}</p>
          <Button href="/login" size="lg" className="mt-8 w-full sm:w-auto">
            {t("startClaim")}
          </Button>
        </Container>
      </section>
    </>
  );
}
