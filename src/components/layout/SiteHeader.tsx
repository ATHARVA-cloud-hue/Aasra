import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Container } from "@/components/ui/Container";
import { HeaderAuth } from "@/components/layout/HeaderAuth";

/*
  The quiet bar at the top of every page: name on the left, the ways to
  get help on the right.

  It stays a server component. The only part that needs to know who is
  signed in is HeaderAuth, which is a few lines of its own.
*/
export function SiteHeader() {
  return (
    <header className="py-5">
      <Container className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <LeafMark />
          <span className="font-serif text-2xl text-ink">{APP_NAME}</span>
        </Link>

        <nav aria-label="Get help" className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <HeaderLink href="/hidden-assets" label="Find lost money on the government portals">
            Find lost money
          </HeaderLink>
          <HeaderLink href="/lawyers">Talk to a lawyer</HeaderLink>
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
