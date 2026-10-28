import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { DEMO_LAWYERS, isDemoLawyer } from "@/lib/lawyers";

/*
  WHAT A CONSULTATION COSTS, DECIDED ON THE SERVER.

  ====================================================================
  WHY THIS FILE EXISTS AT ALL
  ====================================================================
  The browser must never be able to say what it owes. If the amount
  came up with the request, anybody could open the developer console
  and pay a lawyer's ₹2,500 consultation for ₹1.

  So the client sends only a lawyer id, and the fee is looked up here,
  from the same place the price on the card came from. The amount in
  the Razorpay order is the amount this function returns, every time.
*/

/*
  A Supabase client for a server route.

  Built fresh rather than reusing src/lib/supabase/client.ts, which is
  written for the browser: it persists a session and refreshes tokens,
  neither of which makes sense on a server handling one request. This
  one holds no session at all.

  The anon key is enough. The lawyers table has a public read policy,
  because the panel has to be visible to a family who has not made an
  account yet.
*/
function serverClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ResolvedFee = {
  /** Whole rupees. */
  amountInr: number;
  /** For the Razorpay receipt and the confirmation screen. */
  lawyerName: string;
};

/*
  The consultation fee for a lawyer, or null when it cannot be
  established. Null always means "do not take a payment": a missing
  price is never treated as free, and never guessed at.
*/
export async function consultationFeeFor(lawyerId: string): Promise<ResolvedFee | null> {
  if (!lawyerId) return null;

  /*
    A sample lawyer. Their fee is in the same hardcoded list the demo
    panel renders from, so the price on the card and the price charged
    cannot drift apart.
  */
  if (isDemoLawyer({ id: lawyerId } as Parameters<typeof isDemoLawyer>[0])) {
    const demo = DEMO_LAWYERS.find((lawyer) => lawyer.id === lawyerId);
    if (!demo?.consultation_price_inr) return null;

    return { amountInr: demo.consultation_price_inr, lawyerName: demo.name };
  }

  const supabase = serverClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("lawyers")
      .select("name, consultation_price_inr")
      .eq("id", lawyerId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Could not read the consultation fee:", error.message);
      return null;
    }

    const row = data as { name?: unknown; consultation_price_inr?: unknown } | null;

    if (
      !row ||
      typeof row.consultation_price_inr !== "number" ||
      row.consultation_price_inr <= 0
    ) {
      return null;
    }

    return {
      amountInr: row.consultation_price_inr,
      lawyerName: typeof row.name === "string" ? row.name : "",
    };
  } catch (error) {
    console.error(
      "Could not read the consultation fee:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/*
  A client that can WRITE the paid flag onto a consultation.

  Two ways, tried in order:

  1. THE SERVICE ROLE KEY, if one is configured. It bypasses Row Level
     Security, so the write is authoritative and there is no
     client-reachable path that could forge it. This is the right
     answer in production.

  2. THE FAMILY'S OWN ACCESS TOKEN, forwarded by the browser. Row Level
     Security then applies as that person, so they can only ever touch
     their own row. Good enough, and it means payments work with no
     extra configuration at all.

  Either way the write happens here, on the server, and only after a
  signature has verified.
*/
export function writableClient(accessToken: string | null) {
  if (!supabaseUrl) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (!supabaseAnonKey || !accessToken) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
