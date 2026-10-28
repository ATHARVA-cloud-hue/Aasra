import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";

/* Footer on every page, carrying the "not a law firm" line. */
export async function SiteFooter() {
  const t = await getTranslations();

  return (
    <footer className="mt-24 border-t border-line py-10 text-sm text-ink-muted">
      <Container className="space-y-5">
        <nav aria-label={t("footer.label")}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <FooterLink href="/">{t("footer.home")}</FooterLink>
            </li>
            <li>
              <FooterLink href="/login">{t("footer.startHere")}</FooterLink>
            </li>
            <li>
              <FooterLink href="/plan-ahead">{t("footer.planAhead")}</FooterLink>
            </li>
            <li>
              <FooterLink href="/lawyers">{t("nav.talkToLawyer")}</FooterLink>
            </li>
          </ul>
        </nav>

        <p className="max-w-2xl">{t("app.legalLine")}</p>
        <p>{t("footer.copyright", { name: t("app.name") })}</p>
      </Container>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="transition-colors duration-300 hover:text-sage-800">
      {children}
    </Link>
  );
}
