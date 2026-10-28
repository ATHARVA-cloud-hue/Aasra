"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { hasWhatsapp, whatsappLink } from "@/lib/config";
import { PaymentStep } from "@/components/lawyers/PaymentStep";
import {
  isDemoLawyer,
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

  - Prices are shown up front, both of them. A family handed a stack of
    forms should not have to ask what this will cost, and "₹1,500 to
    talk" is a kinder answer than silence.

  - "Request a consultation" never fails. If the request cannot be
    recorded, the button quietly becomes a WhatsApp message with the
    lawyer's name already written in. The family gets through either
    way and never sees why.
*/

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  /* Recorded. consultationId is what the payment step pays against. */
  | { kind: "saved"; consultationId?: string }
  /* A real number is configured, so WhatsApp is a usable way through. */
  | { kind: "whatsapp"; href: string }
  /*
    No WhatsApp number is configured, so there is no link to show. Which
    message to give depends on WHY the request could not be recorded:
    somebody not signed in needs an account, which is a thing they can
    act on; anything else is ours to fix, and says so.
  */
  | { kind: "needsAccount" }
  | { kind: "contactSoon" };

type View = { kind: "loading" } | { kind: "ready"; lawyers: Lawyer[]; from: LawyerSource };

/** "All" plus the fixed specialty list, as filter buttons. */
const FILTERS = ["all", ...SPECIALTIES];

export function LawyerList() {
  const t = useTranslations("lawyers");

  const [view, setView] = useState<View>({ kind: "loading" });
  const [filter, setFilter] = useState<string>("all");
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

  /** The specialty's own label, or the stored value if it is not one of ours. */
  function specialtyLabel(value: string): string {
    return t.has(`specialties.${value}`) ? t(`specialties.${value}`) : value;
  }

  async function ask(lawyer: Lawyer) {
    setStatus((current) => ({ ...current, [lawyer.id]: { kind: "sending" } }));

    const outcome = await requestConsultation(lawyer);

    if (outcome.result === "saved") {
      setStatus((current) => ({
        ...current,
        [lawyer.id]: { kind: "saved", consultationId: outcome.consultationId },
      }));
      return;
    }

    /*
      The request could not be recorded. What happens next depends on
      whether there is a human on the other end of a WhatsApp number.

      With a number: hand back the link rather than calling
      window.open, because a popup the browser blocks would look to the
      family like the button simply did nothing.

      Without one: say something true and useful instead of opening
      WhatsApp to a number that does not answer. Somebody who is not
      signed in is told that an account lets them request directly,
      which is the in-app route and is a thing they can act on.
    */
    const href = whatsappLink(
      t("whatsapp.consultation", {
        name: lawyer.name,
        city: lawyer.city ? t("whatsapp.inCity", { city: lawyer.city }) : "",
      }),
    );

    const next: Status = href
      ? { kind: "whatsapp", href }
      : outcome.reason === "not-signed-in" || outcome.reason === "anonymous"
        ? { kind: "needsAccount" }
        : { kind: "contactSoon" };

    setStatus((current) => ({ ...current, [lawyer.id]: next }));
  }

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          {t("loading")}
        </p>
      </Card>
    );
  }

  const shown =
    filter === "all" ? view.lawyers : view.lawyers.filter((lawyer) => lawyer.specialty === filter);

  return (
    <>
      {view.from === "demo" && (
        <div className="rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="status">
          {t("demoNotice")}
        </div>
      )}

      <Card className={view.from === "demo" ? "mt-5" : ""}>
        <h2 className="text-xl">{t("filterTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("filterBody")}</p>

        <fieldset className="mt-5 border-0 p-0">
          <legend className="sr-only">{t("filterLegend")}</legend>
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
                  {option === "all" ? t("all") : specialtyLabel(option)}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {shown.length === 0 ? (
        <Card className="mt-5">
          <h2 className="text-xl">{t("emptyTitle")}</h2>
          <p className="mt-3 text-ink-soft">
            {t("emptyBody", { specialty: specialtyLabel(filter) })}
          </p>
          {/*
            Only offered when there is actually a number behind it.
            Otherwise the in-app route, which always works.
          */}
          {hasWhatsapp() ? (
            <Button
              href={
                whatsappLink(t("whatsapp.specialty", { specialty: specialtyLabel(filter) })) ?? "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full sm:w-auto"
            >
              {t("emptyButton")}
            </Button>
          ) : (
            <Button href="/login" className="mt-6 w-full sm:w-auto">
              {t("emptyButtonInApp")}
            </Button>
          )}
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
        <h2 className="text-xl">{t("payingTitle")}</h2>
        <p className="mt-3 text-ink-soft">{t("payingBody")}</p>
        <p className="mt-3 text-ink-soft">{t("payingBody2")}</p>
      </Card>
    </>
  );

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
    const consultation = rupees(lawyer.consultation_price_inr);
    const fullCase = rupees(lawyer.full_case_price_inr);

    /*
      A sample lawyer is described from the dictionary so the panel
      reads in every language. A real lawyer's bio is shown as written,
      because it is that person's own words.
    */
    const bio = isDemoLawyer(lawyer) ? t(`demoBios.${lawyer.id}`) : lawyer.bio;

    const subtitle =
      [lawyer.specialty ? specialtyLabel(lawyer.specialty) : null, lawyer.city]
        .filter(Boolean)
        .join(" · ") || t("generalPractice");

    return (
      <Card className="h-full">
        <div className="flex items-start gap-4">
          <Portrait lawyer={lawyer} />

          <div className="min-w-0">
            {/* A name and a city are proper nouns, so they stay as written. */}
            <h2 className="text-xl">{lawyer.name}</h2>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          </div>
        </div>

        {bio && <p className="mt-4 text-ink-soft">{bio}</p>}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {lawyer.years_experience !== null && (
            <Detail label={t("yearsLabel")} value={`${lawyer.years_experience}`} />
          )}
          {languages.length > 0 && <Detail label={t("speaksLabel")} value={languages.join(", ")} />}
          <Detail label={t("consultationLabel")} value={consultation ?? t("onRequest")} />
          <Detail label={t("fullCaseLabel")} value={fullCase ?? t("onRequest")} />
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {status.kind === "whatsapp" ? (
            <Button
              href={status.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              {t("messageAbout", { name: lawyer.name.replace(/^Adv\.\s*/, "") })}
            </Button>
          ) : status.kind === "needsAccount" ? (
            <Button href="/login" className="w-full sm:w-auto">
              {t("createAccountToRequest")}
            </Button>
          ) : (
            <Button
              onClick={onAsk}
              disabled={status.kind === "sending" || status.kind === "saved"}
              className="w-full sm:w-auto"
            >
              {status.kind === "sending"
                ? t("requesting")
                : status.kind === "saved"
                  ? t("requested")
                  : t("request")}
            </Button>
          )}

          <RequestNote status={status} />
        </div>

        {/*
          The payment step appears only once a consultation has actually
          been recorded, so nobody is asked for money before anything
          has been booked.
        */}
        {status.kind === "saved" && (
          <PaymentStep lawyer={lawyer} consultationId={status.consultationId} />
        )}
      </Card>
    );
  }

  /* The quiet confirmation. Nothing has been charged. */
  function RequestNote({ status }: { status: Status }) {
    if (status.kind === "saved") {
      return (
        <p className="text-sm text-sage-800" role="status">
          <span aria-hidden="true">✓ </span>
          {t("savedNote")}
        </p>
      );
    }

    if (status.kind === "whatsapp") {
      return (
        <p className="text-sm text-ink-muted" role="status">
          {t("whatsappNote")}
        </p>
      );
    }

    if (status.kind === "needsAccount") {
      return (
        <p className="text-sm text-ink-soft" role="status">
          {t("needsAccountNote")}
        </p>
      );
    }

    if (status.kind === "contactSoon") {
      return (
        <p className="text-sm text-ink-soft" role="status">
          {t("contactSoonNote")}
        </p>
      );
    }

    return null;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="rtl-isolate text-ink">{value}</dd>
    </div>
  );
}

/*
  A headshot if the panel has one, otherwise initials. Never a stock
  photograph of a stranger standing in for a real person.
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
