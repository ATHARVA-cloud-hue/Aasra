import { consultationFeeFor, writableClient } from "@/lib/payments/fees";
import { isRazorpayConfigured, verifyPaymentSignature } from "@/lib/payments/razorpay";

/*
  POST /api/payments/verify

  The only place in this app that may mark a consultation paid.

  ====================================================================
  WHAT THIS ROUTE REFUSES TO DO
  ====================================================================
  It will not take the browser's word for anything that matters. The
  browser says "this order was paid"; this route checks that claim
  against an HMAC that only Razorpay and this server can produce. A
  request with a wrong or missing signature leaves the row unpaid, and
  the family is shown a calm retry rather than a success they did not
  get.

  ====================================================================
  THE TEST PATH
  ====================================================================
  With no Razorpay keys configured, there is no signature to check and
  { demo: true } marks the row paid so the flow can be demonstrated.

  That path is gated on isRazorpayConfigured() being FALSE, which is a
  server-side fact about the environment. Once real keys are set, a
  browser sending { demo: true } is refused: it cannot talk its way
  back onto the test path.
*/

type Body = {
  consultationId?: unknown;
  lawyerId?: unknown;
  demo?: unknown;
  accessToken?: unknown;
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const consultationId =
      typeof body.consultationId === "string" ? body.consultationId.trim() : "";
    const lawyerId = typeof body.lawyerId === "string" ? body.lawyerId.trim() : "";
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;

    /* ------------------------------------------------------------ */
    /*  1. Establish that the payment really happened               */
    /* ------------------------------------------------------------ */

    let paymentId: string | null = null;
    let orderId: string | null = null;
    let simulated = false;

    if (isRazorpayConfigured()) {
      orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
      paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
      const signature =
        typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

      const valid = verifyPaymentSignature({
        orderId: orderId ?? "",
        paymentId: paymentId ?? "",
        signature,
      });

      if (!valid) {
        /*
          Logged without any of the values, so a failed attempt cannot
          be replayed from a log file. The family sees a retry message.
        */
        console.error("Rejected a payment with an invalid signature.");
        return Response.json({ verified: false, reason: "signature" }, { status: 400 });
      }
    } else {
      // No gateway. The test path, only reachable because the server
      // itself has no keys.
      if (body.demo !== true) {
        return Response.json({ verified: false, reason: "no-gateway" }, { status: 400 });
      }
      simulated = true;
    }

    /* ------------------------------------------------------------ */
    /*  2. Record it                                                */
    /* ------------------------------------------------------------ */

    /*
      The amount is re-read from the server, not taken from the
      request, so the figure stored against the row is the real fee
      even if the browser sent something else.
    */
    const fee = lawyerId ? await consultationFeeFor(lawyerId) : null;

    /*
      No consultation row to update. This is a normal outcome rather
      than an error: a family with no account has no row, and the
      payment still verified. The browser shows the confirmation from
      the verified result and keeps the state on the device.
    */
    if (!consultationId) {
      return Response.json({
        verified: true,
        simulated,
        stored: false,
        amountInr: fee?.amountInr ?? null,
      });
    }

    const supabase = writableClient(accessToken);

    if (!supabase) {
      // Verified, but nowhere to write it. Still a success for the
      // family: the payment happened and the server confirmed it.
      return Response.json({
        verified: true,
        simulated,
        stored: false,
        amountInr: fee?.amountInr ?? null,
      });
    }

    const { error } = await supabase
      .from("consultations")
      .update({
        payment_status: "paid",
        status: "confirmed",
        amount_inr: fee?.amountInr ?? null,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", consultationId);

    if (error) {
      /*
        The payment is real and verified; only the bookkeeping failed.
        Reporting failure here would tell a family who has just paid
        that they have not, which is the worse of the two mistakes. The
        verified result goes back, with stored: false so the screen can
        be honest that the record is still catching up.
      */
      console.error("Could not record a verified payment:", error.message);
      return Response.json({
        verified: true,
        simulated,
        stored: false,
        amountInr: fee?.amountInr ?? null,
      });
    }

    return Response.json({
      verified: true,
      simulated,
      stored: true,
      amountInr: fee?.amountInr ?? null,
    });
  } catch (error) {
    console.error("Payment verification failed:", error instanceof Error ? error.message : error);
    return Response.json({ verified: false, reason: "server" }, { status: 500 });
  }
}
