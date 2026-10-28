import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/*
  PAYMENTS, SERVER SIDE ONLY.

  "server-only" at the top is load-bearing. If any client component ever
  imports this file, the build fails rather than shipping the secret key
  to a browser. That is the single most important line here.

  ====================================================================
  WHY THERE IS NO RAZORPAY SDK
  ====================================================================
  Two calls are needed: create an order, and check a signature. The
  first is one HTTP POST with basic auth. The second is an HMAC, which
  node:crypto already does. A dependency would add a supply-chain
  surface to the one part of this app that handles money, in exchange
  for saving about thirty lines. Not worth it.

  ====================================================================
  TEST MODE
  ====================================================================
  Nothing here is specific to test mode, because nothing needs to be:
  Razorpay decides that from the key. A key beginning rzp_test_ charges
  nothing and settles nothing. isTestKey() below is used only to show
  the family a "test payment" label, so nobody is ever left wondering
  whether real money moved.
*/

const RAZORPAY_API = "https://api.razorpay.com/v1";

/** The key id, safe to show a browser. Empty when not configured. */
export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

/*
  The secret. Never returned to a caller, never logged, never put in a
  response body. Only used inside this file.
*/
function razorpaySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET ?? "";
}

/*
  Is the gateway usable at all?

  Both halves are required. A key id without a secret cannot verify a
  payment, which would mean taking money and being unable to prove it
  arrived, so that counts as not configured rather than half-working.
*/
export function isRazorpayConfigured(): boolean {
  return Boolean(razorpayKeyId() && razorpaySecret());
}

/** True for a test key, so the UI can say so plainly. */
export function isTestKey(): boolean {
  return razorpayKeyId().startsWith("rzp_test_");
}

/* ------------------------------------------------------------------ */
/*  Creating an order                                                 */
/* ------------------------------------------------------------------ */

export type CreatedOrder = {
  orderId: string;
  /** Paise, which is what Razorpay works in. 1500 rupees is 150000. */
  amountPaise: number;
  currency: "INR";
};

/*
  Ask Razorpay for an order.

  The amount arrives here in whole rupees and is converted once, at the
  boundary. Keeping rupees everywhere else and paise only inside this
  function is deliberate: a factor-of-a-hundred error in a payment is
  the kind of bug that is noticed by the person charged.
*/
export async function createOrder(input: {
  amountInr: number;
  /** Shown on the Razorpay dashboard so a payment can be traced back. */
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreatedOrder | null> {
  if (!isRazorpayConfigured()) return null;

  // Whole rupees in, paise out. Guard against a fractional rupee
  // sneaking through and becoming a fractional paise, which Razorpay
  // rejects with an unhelpful error.
  const amountPaise = Math.round(input.amountInr) * 100;

  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    console.error("Refusing to create an order for a non-positive amount.");
    return null;
  }

  const auth = Buffer.from(`${razorpayKeyId()}:${razorpaySecret()}`).toString("base64");

  try {
    const response = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        // Razorpay caps this at 40 characters.
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
    });

    if (!response.ok) {
      /*
        Razorpay's error body can name the account. Only the status is
        logged, never the body, so nothing identifying ends up in a
        server log that somebody later pastes into a ticket.
      */
      console.error("Razorpay order creation failed with status", response.status);
      return null;
    }

    const order = (await response.json()) as { id?: unknown; amount?: unknown };

    if (typeof order.id !== "string" || typeof order.amount !== "number") {
      console.error("Razorpay returned an order in an unexpected shape.");
      return null;
    }

    return { orderId: order.id, amountPaise: order.amount, currency: "INR" };
  } catch (error) {
    console.error("Razorpay order creation failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Verifying a payment                                               */
/* ------------------------------------------------------------------ */

/*
  THE ONLY THING THAT MAY MARK A CONSULTATION PAID.

  Razorpay's checkout hands the browser three values and a signature.
  The signature is an HMAC-SHA256 of "<order_id>|<payment_id>" keyed
  with the secret. Because only Razorpay and this server know the
  secret, a signature that verifies could not have been produced by the
  browser, which is what makes the claim trustworthy.

  The comparison uses timingSafeEqual rather than ===. A string compare
  returns as soon as two characters differ, and that timing difference
  is enough, over many attempts, to work out a valid signature one
  character at a time. The cost of doing it properly is one line.
*/
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!isRazorpayConfigured()) return false;
  if (!input.orderId || !input.paymentId || !input.signature) return false;

  const expected = createHmac("sha256", razorpaySecret())
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  /*
    timingSafeEqual throws if the two buffers differ in length, so the
    lengths are checked first. A wrong length is a wrong signature
    anyway, and leaking "your signature was the wrong length" tells an
    attacker nothing they did not already know.
  */
  const given = Buffer.from(input.signature, "utf8");
  const mine = Buffer.from(expected, "utf8");

  if (given.length !== mine.length) return false;

  try {
    return timingSafeEqual(given, mine);
  } catch {
    return false;
  }
}
