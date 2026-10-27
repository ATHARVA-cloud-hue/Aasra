import Link from "next/link";
import { APP_NAME, LEGAL_LINE, whatsappLink } from "@/lib/config";
import { Container } from "@/components/ui/Container";

/* Footer on every page, carrying the "not a law firm" line from the brief. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line py-10 text-sm text-ink-muted">
      <Container className="space-y-5">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <FooterLink href="/">Home</FooterLink>
            </li>
            <li>
              <FooterLink href="/login">Start here</FooterLink>
            </li>
            <li>
              <FooterLink href="/plan-ahead">Plan ahead</FooterLink>
            </li>
            <li>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-300 hover:text-sage-800"
              >
                Talk to a person
              </a>
            </li>
          </ul>
        </nav>

        <p className="max-w-2xl">{LEGAL_LINE}</p>
        <p>© {APP_NAME} · Demo build. All names, families and numbers shown in the demo are fictional.</p>
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
