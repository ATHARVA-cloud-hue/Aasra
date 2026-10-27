import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
  THE SUPABASE CONNECTION, FOR THE BROWSER.

  Only the two NEXT_PUBLIC_ variables are used here. The Supabase
  "publishable" (anon) key is designed to be public — on its own it can
  do nothing, because every table is protected by the Row Level Security
  policies in supabase/schema.sql. The database decides what you may see,
  not the key.

  If the keys are missing, this returns null instead of throwing, and
  every caller treats null as "work offline with local data".
*/

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseKeys = Boolean(url && key);

// Built once and reused, so the whole app shares one login session.
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  if (!hasSupabaseKeys) {
    cached = null;
    return null;
  }

  try {
    cached = createClient(url, key, {
      auth: {
        // Remember the session in the browser, so a family can close the
        // tab and come back to their case tomorrow.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error("Could not start Supabase:", error instanceof Error ? error.message : error);
    cached = null;
  }

  return cached;
}
