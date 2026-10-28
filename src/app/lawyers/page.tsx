import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { whatsappLink } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { LawyerList } from "@/components/lawyers/LawyerList";

/*
  TALK TO A LAWYER.

  The "Talk to a lawyer" link in the header, the footer and the chat
  panel all land here. It is reachable from anywhere in the app and
  needs nothing: no login, no case, no answers. Somebody may arrive on
  it in the first hour after a death.

  The panel itself is in LawyerList, which always renders somebody.
*/
export default async function LawyersPage() {
  const t = await getTranslations();

  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">{t("lawyers.title")}</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">{t("lawyers.lead")}</p>
        </FadeIn>

        <FadeIn delay={300} className="mt-10">
          <LawyerList />
        </FadeIn>

        <FadeIn delay={450}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/" variant="secondary" className="w-full sm:w-auto">
              {t("common.backToStart")}
            </Button>
            <Button
              href={whatsappLink(t("lawyers.whatsapp.unsure"))}
              variant="quiet"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              {t("lawyers.notSure")}
            </Button>
          </div>
        </FadeIn>

        <p className="mt-8 text-sm text-ink-muted">{t("app.legalLine")}</p>
      </Container>
    </section>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("lawyers.title") };
}
