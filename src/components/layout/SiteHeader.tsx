import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { HeaderAuth } from "@/components/layout/HeaderAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

/*
  The bar at the top of every page: the name on one side, the ways to
  get help on the other.

  It stays a server component. The two parts that cannot be are the
  language menu and HeaderAuth, each of which is small and separate.
*/
export async function SiteHeader() {
  const t = await getTranslations();
  const appName = t("app.name");

  return (
    <header className="py-5">
      <Container className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label={t("nav.homeLabel", { name: appName })}
        >
          <LeafMark />
          <span className="font-serif text-2xl text-ink">{appName}</span>
        </Link>

        <nav aria-label={t("nav.getHelp")} className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <HeaderLink href="/recovery" label={t("nav.recoveryFull")}>
            {t("nav.recovery")}
          </HeaderLink>
          <HeaderLink href="/hidden-assets" label={t("nav.findLostMoneyFull")}>
            {t("nav.findLostMoney")}
          </HeaderLink>
          <HeaderLink href="/lawyers">{t("nav.talkToLawyer")}</HeaderLink>
          <LanguageSwitcher />
          <HeaderAuth />
        </nav>
      </Container>
    </header>
  );
}

/*
  `label` is for links whose visible text is shortened to fit the bar:
  it gives a screen reader, and a long-press on a phone, the full thing.
*/
function HeaderLink({ href, children, label }: { href: string; children: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-full px-3 py-2 text-base text-ink-soft transition-colors duration-300 hover:bg-sage-50 hover:text-sage-800"
    >
      {children}
    </Link>
  );
}

/* A simple leaf drawn in SVG — our small, calm logo. */
function LeafMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--color-sage-100)" />
      <path
        d="M10 22c0-7 5-12 13-12 0 8-5 13-12 13"
        fill="none"
        stroke="var(--color-sage-600)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 22l7-7" stroke="var(--color-sage-600)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
