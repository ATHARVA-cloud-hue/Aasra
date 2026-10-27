import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/* Shown for any address that doesn't exist — kind words, and a way back. */
export default function NotFound() {
  return (
    <section className="py-20">
      <Container width="narrow" className="text-center">
        <h1 className="text-4xl">We couldn&apos;t find that page</h1>
        <p className="mt-6 text-lg text-ink-soft">Nothing is lost — your progress is saved. Let&apos;s take you back.</p>
        <Button href="/" className="mt-10">
          Back to the start
        </Button>
      </Container>
    </section>
  );
}
