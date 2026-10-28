import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/* Shown for any address that does not exist, with a way back. */
export default async function NotFound() {
  const t = await getTranslations();

  return (
    <section className="py-20">
      <Container width="narrow" className="text-center">
        <h1 className="text-4xl">{t("errors.notFoundTitle")}</h1>
        <p className="mt-6 text-lg text-ink-soft">{t("errors.notFoundBody")}</p>
        <Button href="/" className="mt-10">
          {t("common.backToStart")}
        </Button>
      </Container>
    </section>
  );
}
