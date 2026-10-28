"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { rupees, type Lawyer } from "@/lib/lawyers";

/*
  PAYING THE CONSULTATION FEE.

  Appears only after a consultation has actually been recorded, so a
  family is never asked for money before anything has been booked.

  ====================================================================
  THREE THINGS THIS COMPONENT CANNOT DO
  ====================================================================
  1. It cannot decide the amount. It asks the server for an order and
     shows whatever amount comes back. The figure in the Razorpay
     window is the server's, read from the lawyer's record.

  2. It cannot mark anything paid. Razorpay hands it a signature, it
     posts that to /api/payments/verify, and the server decides. If
     verification fails the screen says so and offers a retry; it does
     not quietly succeed.

  3. It cannot choose the test path. Whether the gateway is real is
     decided server-side from whether the keys exist.

  ====================================================================
  THE TEST PATH
  ====================================================================
  With no Razorpay keys, the server replies gateway: "demo" and this
  shows a labelled test screen with a button that completes the flow.
  The label is deliberately unmissable: nobody should be left unsure
  whether real money moved.
*/

type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "demo"; amountInr: number; degraded: boolean }
  | { name: "paying" }
  | { name: "verifying" }
  | { name: "paid"; amountInr: number | null; simulated: boolean; stored: boolean }
  | { name: "failed"; reason: "cancelled" | "verify" | "setup" };

/** What the checkout script puts on the window once it has loaded. */
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: Record<string, string>) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

type RazorpayInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/*
  Load the checkout script, once, and only when somebody actually
  presses Pay.

  Not in the page's <head>: a family reading about lawyers should not be
  made to download a payment gateway, and most never reach this step.
*/
function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentStep({
  lawyer,
  consultationId,
}: {
  lawyer: Lawyer;
  /** Undefined when no row was created, which is a valid state. */
  consultationId?: string;
}) {
  const t = useTranslations("payment");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  /** The family's own token, so the server can write as them. */
  async function accessToken(): Promise<string | null> {
    try {
      const { getSupabase } = await import("@/lib/supabase/client");
      const supabase = getSupabase();
      if (!supabase) return null;

      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  /** Post a verification claim and act on what the SERVER decides. */
  async function verify(payload: Record<string, unknown>) {
    setPhase({ name: "verifying" });

    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          consultationId,
          lawyerId: lawyer.id,
          accessToken: await accessToken(),
        }),
      });

      const result = (await response.json()) as {
        verified?: boolean;
        simulated?: boolean;
        stored?: boolean;
        amountInr?: number | null;
      };

      if (!response.ok || !result.verified) {
        setPhase({ name: "failed", reason: "verify" });
        return;
      }

      setPhase({
        name: "paid",
        amountInr: result.amountInr ?? null,
        simulated: result.simulated === true,
        stored: result.stored === true,
      });
    } catch {
      setPhase({ name: "failed", reason: "verify" });
    }
  }

  async function start() {
    setPhase({ name: "starting" });

    let order: {
      gateway?: string;
      orderId?: string;
      amountPaise?: number;
      amountInr?: number;
      keyId?: string;
      degraded?: boolean;
    };

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the lawyer id. No amount: the server decides that.
        body: JSON.stringify({ lawyerId: lawyer.id }),
      });

      if (!response.ok) {
        setPhase({ name: "failed", reason: "setup" });
        return;
      }

      order = await response.json();
    } catch {
      setPhase({ name: "failed", reason: "setup" });
      return;
    }

    // No gateway configured, or it would not create an order.
    if (order.gateway !== "razorpay") {
      setPhase({
        name: "demo",
        amountInr: order.amountInr ?? lawyer.consultation_price_inr ?? 0,
        degraded: order.degraded === true,
      });
      return;
    }

    const ready = await loadCheckout();
    if (!ready || !window.Razorpay || !order.orderId || !order.keyId) {
      // The script is blocked or offline. The test screen at least lets
      // the family finish rather than leaving a dead button.
      setPhase({
        name: "demo",
        amountInr: order.amountInr ?? 0,
        degraded: true,
      });
      return;
    }

    setPhase({ name: "paying" });

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise ?? 0,
      currency: "INR",
      name: t("brandName"),
      description: t("description", { name: lawyer.name }),
      order_id: order.orderId,
      handler: (response) => void verify(response),
      modal: {
        // Closing the window is a decision, not an error.
        ondismiss: () => setPhase({ name: "failed", reason: "cancelled" }),
      },
      theme: { color: "#4f7358" },
    });

    checkout.open();
  }

  /* ---------------------------------------------------------------- */

  if (phase.name === "paid") {
    return (
      <div className="mt-5 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-4">
        <p className="text-sage-800">
          <span aria-hidden="true">✓ </span>
          {phase.simulated ? t("paidSimulated") : t("paidTitle")}
        </p>

        {phase.amountInr !== null && (
          <p className="rtl-isolate mt-2 text-sm text-sage-800">
            {t("paidAmount", { amount: rupees(phase.amountInr) ?? "" })}
          </p>
        )}

        {!phase.stored && <p className="mt-2 text-sm text-sage-800">{t("paidNotStored")}</p>}
      </div>
    );
  }

  if (phase.name === "demo") {
    return (
      <div className="mt-5 rounded-2xl border border-clay-200 bg-clay-50 px-4 py-4">
        {/* Deliberately unmissable. Nobody should wonder if money moved. */}
        <p className="font-medium text-clay-700">{t("testTitle")}</p>
        <p className="mt-2 text-sm text-clay-700">
          {phase.degraded ? t("testBodyDegraded") : t("testBody")}
        </p>
        <p className="rtl-isolate mt-2 text-sm text-clay-700">
          {t("testAmount", { amount: rupees(phase.amountInr) ?? "" })}
        </p>

        <Button onClick={() => void verify({ demo: true })} className="mt-4 w-full sm:w-auto">
          {t("simulate")}
        </Button>
      </div>
    );
  }

  if (phase.name === "failed") {
    return (
      <div className="mt-5 rounded-2xl bg-clay-50 px-4 py-4">
        <p className="text-sm text-clay-700">
          {phase.reason === "cancelled"
            ? t("cancelled")
            : phase.reason === "setup"
              ? t("setupFailed")
              : t("verifyFailed")}
        </p>
        <Button
          variant="secondary"
          onClick={() => void start()}
          className="mt-4 w-full sm:w-auto"
        >
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  const busy = phase.name === "starting" || phase.name === "paying" || phase.name === "verifying";

  return (
    <div className="mt-5">
      <Button onClick={() => void start()} disabled={busy} className="w-full sm:w-auto">
        {phase.name === "starting"
          ? t("opening")
          : phase.name === "paying"
            ? t("waiting")
            : phase.name === "verifying"
              ? t("verifying")
              : t("payFee", { amount: rupees(lawyer.consultation_price_inr) ?? "" })}
      </Button>

      <p className="mt-3 text-sm text-ink-muted">{t("note")}</p>
    </div>
  );
}
