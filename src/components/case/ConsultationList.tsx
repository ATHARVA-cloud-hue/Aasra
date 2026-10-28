"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { rupees } from "@/lib/lawyers";
import type { ConsultationRow } from "@/lib/caseStore";

/*
  CONSULTATION REQUESTS, AND WHETHER THE FEE IS PAID.

  On the case tracker because that is the page a family returns to, and
  "have I paid that lawyer yet?" is exactly the question they come back
  with.

  Three states, and none of them is a blank area:

  - LOADING: a calm line, not a spinner and not an empty box.
  - EMPTY: an explanation and the way to the lawyer panel. A family
    with no requests yet should be told that is normal.
  - DEMO: a sample request, paid, so the whole screen reads as complete
    when somebody is clicking through.
*/

type View =
  | { kind: "loading" }
  | { kind: "demo" }
  | { kind: "ready"; rows: ConsultationRow[] };

/** The sample request shown in demo mode. */
const DEMO_ROW: ConsultationRow = {
  id: "demo-consultation",
  lawyer_name: "Adv. Rukmini Deshpande",
  status: "confirmed",
  payment_status: "paid",
  amount_inr: 1500,
  created_at: "2024-03-18",
};

export function ConsultationList() {
  const t = useTranslations("consultations");
  const locale = useLocale();

  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, loadConsultations } = await import("@/lib/caseStore");

      // Demo mode never reads a real family's requests.
      if (getMode() === "demo") {
        if (!cancelled) setView({ kind: "demo" });
        return;
      }

      const rows = await loadConsultations();
      if (!cancelled) setView({ kind: "ready", rows });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <Card className="mt-5">
        <h2 className="text-xl">{t("title")}</h2>
        <p className="mt-3 text-ink-soft" role="status">
          {t("loading")}
        </p>
      </Card>
    );
  }

  const rows = view.kind === "demo" ? [DEMO_ROW] : view.rows;

  if (rows.length === 0) {
    return (
      <Card className="mt-5">
        <h2 className="text-xl">{t("title")}</h2>
        <p className="mt-3 text-ink-soft">{t("emptyBody")}</p>
        <Button href="/lawyers" variant="secondary" className="mt-6 w-full sm:w-auto">
          {t("emptyButton")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-5">
      <h2 className="text-xl">{t("title")}</h2>

      {view.kind === "demo" && (
        <p className="mt-3 rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">
          {t("demoNotice")}
        </p>
      )}

      <ul className="mt-5 divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              {/* A lawyer's name is a proper noun, so it stays as written. */}
              <span className="text-ink">{row.lawyer_name ?? t("aLawyer")}</span>
              <PaymentBadge status={row.payment_status} />
            </div>

            <p className="mt-1 text-sm text-ink-muted">
              {row.amount_inr !== null && (
                <span className="rtl-isolate">
                  {t("fee", { amount: rupees(row.amount_inr) ?? "" })}
                </span>
              )}
              {row.amount_inr !== null && row.created_at && <span aria-hidden="true"> · </span>}
              {row.created_at && <span>{t("requestedOn", { date: formatDate(row.created_at, locale) })}</span>}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm text-ink-muted">{t("note")}</p>
    </Card>
  );

  /*
    Paid or unpaid, said plainly. Sage for paid, clay for unpaid:
    unpaid is something still to do, not a failure, so it is warm
    rather than alarming.
  */
  function PaymentBadge({ status }: { status: string | null }) {
    const paid = status === "paid";

    return (
      <span
        className={`rounded-full px-3 py-1 text-sm ${
          paid ? "bg-sage-100 text-sage-800" : "bg-clay-50 text-clay-700"
        }`}
      >
        {paid ? t("paid") : t("unpaid")}
      </span>
    );
  }
}

/*
  "2024-03-18" becomes "18 March 2024", with the month name in the
  language being read. A timestamp from the database is cut to its date
  part first. Anything unparseable is shown as it came, rather than
  risking a crash on a row the tracker only displays.
*/
function formatDate(value: string, locale: string): string {
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return value;

  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;

  try {
    return date.toLocaleDateString(`${locale}-IN`, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return datePart;
  }
}
