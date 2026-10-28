import { consultationFeeFor } from "@/lib/payments/fees";
import {
  createOrder,
  isRazorpayConfigured,
  isTestKey,
  razorpayKeyId,
} from "@/lib/payments/razorpay";

/*
  POST /api/payments/create-order

  The browser sends a lawyer id. It does NOT send an amount, and if it
  did, this route would ignore it: the fee is looked up here from the
  same source the price on the lawyer's card came from. That is the one
  rule this route exists to enforce.

  Two shapes come back.

  WITH RAZORPAY KEYS: a real order id, the amount in paise, and the
  public key id the checkout widget needs. The secret never leaves the
  server.

  WITHOUT KEYS: { gateway: "demo" } and the amount. The browser then
  shows a clearly labelled test-payment screen instead of a checkout
  widget, so the whole flow is walkable with no account anywhere. The
  demo path is decided HERE, on the server, from whether the keys
  exist. A browser cannot ask for it.
*/

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lawyerId?: unknown };

    const lawyerId = typeof body.lawyerId === "string" ? body.lawyerId.trim() : "";
    if (!lawyerId) {
      return Response.json({ error: "missing-lawyer" }, { status: 400 });
    }

    // The authoritative fee. Null means no price could be established,
    // which is never treated as free.
    const fee = await consultationFeeFor(lawyerId);
    if (!fee) {
      return Response.json({ error: "no-fee" }, { status: 404 });
    }

    /*
      No gateway configured. Hand back the amount so the test screen can
      show the family what they would have paid, and nothing else.
    */
    if (!isRazorpayConfigured()) {
      return Response.json({
        gateway: "demo" as const,
        amountInr: fee.amountInr,
        lawyerName: fee.lawyerName,
      });
    }

    const order = await createOrder({
      amountInr: fee.amountInr,
      // Prefixed so a payment can be traced back from the Razorpay
      // dashboard to a consultation request.
      receipt: `aasra-${lawyerId}`,
      notes: { lawyerId },
    });

    // Razorpay was configured but would not create the order. Fall back
    // to the test screen rather than stranding the family on a dead
    // button: they still get through, and the server log has the reason.
    if (!order) {
      return Response.json({
        gateway: "demo" as const,
        amountInr: fee.amountInr,
        lawyerName: fee.lawyerName,
        degraded: true,
      });
    }

    return Response.json({
      gateway: "razorpay" as const,
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      amountInr: fee.amountInr,
      currency: order.currency,
      // The PUBLIC key id. Checkout needs it in the browser; the secret
      // is never part of any response.
      keyId: razorpayKeyId(),
      testMode: isTestKey(),
      lawyerName: fee.lawyerName,
    });
  } catch (error) {
    console.error("Order creation failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
