"use client"; // Error boundaries must be Client Components

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/*
  If anything on a page crashes, this screen appears instead of a blank
  white page. Header and footer stay in place, so the language menu
  still works from here.
*/
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-20">
      <Container width="narrow" className="text-center">
        <h1 className="text-4xl">{t("errors.crashTitle")}</h1>
        <p className="mt-6 text-lg text-ink-soft">{t("errors.crashBody")}</p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()}>{t("errors.tryAgain")}</Button>
          <Button href="/" variant="secondary">
            {t("common.backToStart")}
          </Button>
        </div>
      </Container>
    </section>
  );
}
