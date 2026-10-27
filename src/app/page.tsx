import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { AskButton } from "@/components/chat/AskButton";

/*
  LANDING PAGE
  One clear choice at the top: "You've lost someone — start here".
  Everything below is quiet reassurance, not a sales pitch.
*/

const steps = [
  {
    title: "Tell us a little",
    body: "One gentle question at a time. Stop whenever you need to — we save as you go.",
  },
  {
    title: "We find and organise",
    body: "Photograph a document and we read it for you. We also help you look for money you may not know about.",
  },
  {
    title: "We walk with you to the end",
    body: "A clear list of what each bank or insurer needs, with a lawyer checking anything legal.",
  },
];

const whoWeHelp = [
  { title: "There was no will", body: "Most families don't have one. That's okay — we start from wherever you are." },
  { title: "You're not sure what exists", body: "Old bank accounts, insurance or EPF can be forgotten. We help you search." },
  { title: "You live abroad", body: "Handle things from another country, with help on the ground in India." },
  { title: "This is your first time", body: "Never dealt with banks or paperwork? Plain words, and a person to talk to." },
  { title: "They ran a business", body: "GST, licences, staff and business accounts — we'll help with those too." },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="pb-20 pt-10 sm:pt-20">
        <Container width="narrow" className="text-center">
          <FadeIn>
            <p className="text-base text-ink-muted">We&apos;re so sorry for your loss.</p>
          </FadeIn>

          <FadeIn delay={150}>
            <h1 className="mt-5 text-4xl sm:text-5xl">
              We&apos;ll help you with what comes next, one step at a time.
            </h1>
          </FadeIn>

          <FadeIn delay={300}>
            <p className="mt-6 text-lg text-ink-soft">
              We guide your family through claiming what your loved one left behind — bank accounts, insurance, EPF,
              shares and property. From &ldquo;what do we do now?&rdquo; to the money reaching you.
            </p>
          </FadeIn>

          <FadeIn delay={450} className="mt-10 flex flex-col items-center gap-4">
            <Button href="/login" size="lg" className="w-full sm:w-auto">
              You&apos;ve lost someone — start here
            </Button>
            <Button href="/plan-ahead" variant="secondary" className="w-full sm:w-auto">
              Plan ahead for my family
            </Button>
          </FadeIn>

          <FadeIn delay={600}>
            <p className="mt-6 text-sm text-ink-muted">Free to begin · No will needed · You can stop and come back anytime</p>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- A doubt, right now ---------- */}
      <section className="pb-8">
        <Container width="narrow">
          <FadeIn>
            <Card className="text-center">
              <h2 className="text-xl">Have an immediate doubt?</h2>
              <p className="mt-2 text-ink-soft">
                You do not have to start anything to ask. Say what is worrying you, in your own words, and our
                assistant will answer in plain language — at three in the morning if that is when it comes.
              </p>
              <AskButton className="mt-6 w-full sm:w-auto">Ask our assistant</AskButton>
            </Card>
          </FadeIn>
        </Container>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl">How we help</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100 font-serif text-lg text-sage-800">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl">{step.title}</h3>
                  <p className="mt-2 text-ink-soft">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- Our principle ---------- */}
      <section className="py-16">
        <Container width="narrow" className="text-center">
          <blockquote className="font-serif text-2xl leading-snug text-ink sm:text-3xl">
            &ldquo;Technology does the reading, writing, translating and reminding. Lawyers do the deciding.&rdquo;
          </blockquote>
          <p className="mt-5 text-ink-soft">
            Our assistant helps organise and explain. A qualified lawyer approves anything legal before your family sees
            it.
          </p>
        </Container>
      </section>

      {/* ---------- Who we're here for ---------- */}
      <section className="py-16">
        <Container>
          <h2 className="text-center text-3xl">Wherever you&apos;re starting from</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whoWeHelp.map((item) => (
              <li key={item.title}>
                <Card className="h-full">
                  <h3 className="text-xl">{item.title}</h3>
                  <p className="mt-2 text-ink-soft">{item.body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------- Closing invitation ---------- */}
      <section className="py-16">
        <Container width="narrow" className="text-center">
          <h2 className="text-3xl">Whenever you&apos;re ready</h2>
          <p className="mt-4 text-ink-soft">There&apos;s no rush. It takes a few minutes to begin, and we save as you go.</p>
          <Button href="/login" size="lg" className="mt-8 w-full sm:w-auto">
            Start here
          </Button>
        </Container>
      </section>
    </>
  );
}
