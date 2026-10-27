"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/*
  If anything on a page crashes, this calm screen appears instead of
  a blank white page. Header and footer stay in place.
*/
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="py-20">
      <Container width="narrow" className="text-center">
        <h1 className="text-4xl">Something didn&apos;t load properly</h1>
        <p className="mt-6 text-lg text-ink-soft">
          This is our fault, not yours. Your progress is safe. Please try again in a moment.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => retry()}>Try again</Button>
          <Button href="/" variant="secondary">
            Back to the start
          </Button>
        </div>
      </Container>
    </section>
  );
}
