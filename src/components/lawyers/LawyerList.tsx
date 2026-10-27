"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { whatsappLink } from "@/lib/config";
import {
  loadLawyers,
  requestConsultation,
  rupees,
  SPECIALTIES,
  type Lawyer,
  type LawyerSource,
} from "@/lib/lawyers";

/*
  THE PANEL OF LAWYERS.

  This is where "Talk to a lawyer" lands, so the screen has to work
  before anything else does: no keys, no table, no signal. The list
  itself comes from src/lib/lawyers.ts, which always returns somebody.

  Two deliberate choices on this page:

  - Prices are shown up front, both of them. A family that has just
    been handed a stack of forms should not have to ask what this will
    cost, and "₹1,500 to talk" is a kinder answer than silence.

  - "Request a consultation" never fails. If we cannot record the
    request, the button quietly becomes a WhatsApp message with the
    lawyer's name already written in. The family gets through either
    way and never sees why.
*/

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "saved" }
  | { kind: "whatsapp"; href: string };

type View =
  | { kind: "loading" }
  | { kind: "ready"; lawyers: Lawyer[]; from: LawyerSource };

/** "All" plus the fixed specialty list, as filter buttons. */
const FILTERS = ["All", ...SPECIALTIES] as const;

export function LawyerList() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [filter, setFilter] = useState<string>("All");
  const [status, setStatus] = useState<Record<string, Status>>({});

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { lawyers, from } = await loadLawyers();
      if (!cancelled) setView({ kind: "ready", lawyers, from });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function ask(lawyer: Lawyer) {
    setStatus((current) => ({ ...current, [lawyer.id]: { kind: "sending" } }));

    const outcome = await requestConsultation(lawyer);

    if (outcome.result === "saved") {
      setStatus((current) => ({ ...current, [lawyer.id]: { kind: "saved" } }));
      return;
    }

    /*
      Falling back to WhatsApp. We hand back a link rather than calling
      window.open, because a popup that the browser blocks would look
      to the family like the button simply did nothing.
    */
    const href = whatsappLink(
      `Hello, I would like a consultation with ${lawyer.name}` +
        `${lawyer.city ? ` in ${lawyer.city}` : ""}. Please tell me what to do next.`,
    );
    setStatus((current) => ({ ...current, [lawyer.id]: { kind: "whatsapp", href } }));
  }

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          Finding lawyers who work with families like yours…
        </p>
      </Card>
    );
  }

  const shown =
    filter === "All" ? view.lawyers : view.lawyers.filter((lawyer) => lawyer.specialty === filter);

  return (
    <>
      {view.from === "demo" && (
        <div className="rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="status">
          A sample panel. These are not real practitioners — tap the button and one of us will answer instead.
        </div>
      )}

      <Card className={view.from === "demo" ? "mt-5" : ""}>
        <h2 className="text-xl">What kind of help do you need?</h2>
        <p className="mt-2 text-ink-soft">
          If you are not sure, leave this on &ldquo;All&rdquo; — or choose General, which is a good first
          conversation when you do not yet know what to ask.
        </p>

        <fieldset className="mt-5 border-0 p-0">
          <legend className="sr-only">Filter lawyers by specialty</legend>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((option) => {
              const chosen = filter === option;
              return (
                <label
                  key={option}
                  className={
                    "min-h-12 cursor-pointer rounded-2xl border px-4 py-2.5 text-base transition-colors duration-200 " +
                    "flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 " +
                    "focus-within:outline-sage-400 " +
                    (chosen
                      ? "border-sage-600 bg-sage-600 text-white"
                      : "border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50")
                  }
                >
                  <input
                    type="radio"
                    name="specialty"
                    value={option}
                    checked={chosen}
                    onChange={() => setFilter(option)}
                    className="sr-only"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {shown.length === 0 ? (
        <Card className="mt-5">
          <h2 className="text-xl">Nobody listed for that yet</h2>
          <p className="mt-3 text-ink-soft">
            We do not have a lawyer on the panel for {filter.toLowerCase()} at the moment. Tell us what you need and
            we will find somebody — it is what we do.
          </p>
          <Button
            href={whatsappLink(`Hello, I am looking for a lawyer who works on ${filter.toLowerCase()}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full sm:w-auto"
          >
            Tell us what you need
          </Button>
        </Card>
      ) : (
        <ul className="mt-5 space-y-5">
          {shown.map((lawyer) => (
            <li key={lawyer.id}>
              <LawyerCard
                lawyer={lawyer}
                status={status[lawyer.id] ?? { kind: "idle" }}
                onAsk={() => void ask(lawyer)}
              />
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-5">
        <h2 className="text-xl">How paying works</h2>
        <p className="mt-3 text-ink-soft">
          The consultation price is for one conversation — long enough to understand your family&apos;s situation and
          tell you what is actually needed. The full-case price covers the whole claim through to the money reaching
          you, and is agreed in writing before anything starts.
        </p>
        <p className="mt-3 text-ink-soft">
          Nothing is charged for asking. If a lawyer thinks you do not need one, they will say so.
        </p>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- */

function LawyerCard({
  lawyer,
  status,
  onAsk,
}: {
  lawyer: Lawyer;
  status: Status;
  onAsk: () => void;
}) {
  const languages = (lawyer.languages ?? []).filter(Boolean);

  return (
    <Card className="h-full">
      <div className="flex items-start gap-4">
        <Portrait lawyer={lawyer} />

        <div className="min-w-0">
          <h2 className="text-xl">{lawyer.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {[lawyer.specialty, lawyer.city].filter(Boolean).join(" · ") || "General practice"}
          </p>
        </div>
      </div>

      {lawyer.bio && <p className="mt-4 text-ink-soft">{lawyer.bio}</p>}

      <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {lawyer.years_experience !== null && (
          <Detail label="Years practising" value={`${lawyer.years_experience}`} />
        )}
        {languages.length > 0 && <Detail label="Speaks" value={languages.join(", ")} />}
        <Detail label="One consultation" value={rupees(lawyer.consultation_price_inr)} />
        <Detail label="The whole case" value={rupees(lawyer.full_case_price_inr)} />
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {status.kind === "whatsapp" ? (
          <Button href={status.href} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            Message us about {lawyer.name.replace(/^Adv\.\s*/, "")}
          </Button>
        ) : (
          <Button
            onClick={onAsk}
            disabled={status.kind === "sending" || status.kind === "saved"}
            className="w-full sm:w-auto"
          >
            {status.kind === "sending"
              ? "One moment…"
              : status.kind === "saved"
                ? "Requested"
                : "Request a consultation"}
          </Button>
        )}

        <RequestNote status={status} />
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/*
  A headshot if the panel has one, otherwise their initials. Never a
  stock photograph of a stranger standing in for a real person.
*/
function Portrait({ lawyer }: { lawyer: Lawyer }) {
  const initials = lawyer.name
    .replace(/^Adv\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  if (lawyer.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={lawyer.photo_url}
        alt=""
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage-100 font-serif text-lg text-sage-800"
    >
      {initials}
    </span>
  );
}

/* The calm confirmation. Deliberately quiet — nothing has been charged. */
function RequestNote({ status }: { status: Status }) {
  if (status.kind === "saved") {
    return (
      <p className="text-sm text-sage-800" role="status">
        <span aria-hidden="true">✓ </span>
        Asked for. One of us will be in touch — there is nothing more for you to do.
      </p>
    );
  }

  if (status.kind === "whatsapp") {
    return (
      <p className="text-sm text-ink-muted" role="status">
        Easiest by message — the lawyer&apos;s name is already written in for you.
      </p>
    );
  }

  return null;
}
