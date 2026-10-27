import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { LoginChoices } from "@/components/login/LoginChoices";

/*
  WHERE THE JOURNEY STARTS.

  The three ways in live in LoginChoices, which is also where a visitor
  is marked as a real family or a demo one. Phone sign-in needs an SMS
  provider set up in Supabase, so it is shown but switched off.
*/
export default function LoginPage() {
  return (
    <section className="py-12 sm:py-16">
      <Container width="narrow">
        <FadeIn>
          <h1 className="text-3xl sm:text-4xl">Let&apos;s begin, gently</h1>
        </FadeIn>

        <FadeIn delay={150}>
          <p className="mt-5 text-lg text-ink-soft">
            You do not need any documents to start. Answer what you can, skip what you cannot, and we will save your
            place as you go.
          </p>
        </FadeIn>

        <FadeIn delay={300} className="mt-10 space-y-5">
          <LoginChoices />
        </FadeIn>

        <FadeIn delay={450}>
          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/" variant="secondary" className="w-full sm:w-auto">
              Back to the start
            </Button>
            <Button href="/lawyers" variant="quiet" className="w-full sm:w-auto">
              I would rather talk to a lawyer
            </Button>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
