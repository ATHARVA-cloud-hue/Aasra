/*
  Which services are switched on?

  The app has two "modes":
  - REAL mode: Supabase and/or Claude keys are set in .env.local.
  - DEMO mode: keys are missing, so we use local sample data and
    pre-written AI answers. The demo must never break.

  Each service is checked separately, so you can, for example,
  add a Claude key but keep demo data.
*/

// ---- Safe to use anywhere (browser or server) ----
// NEXT_PUBLIC_ variables are copied into the browser bundle at build time.
// The Supabase "anon" key is designed to be public, so this is fine.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ---- Server only ----
// Never import these into a "use client" file. These keys have no
// NEXT_PUBLIC_ prefix, so they stay on the server and are never sent
// to anyone's browser.
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/*
  Which Gemini model to use. Both can be overridden in .env.local.

  The defaults are the two models Google currently recommends for new
  projects. If you ever see a "model not found" error, the name has
  moved on — check ai.google.dev/gemini-api/docs/models and set
  GEMINI_MODEL_FAST / GEMINI_MODEL_VISION in .env.local.
*/
export function geminiFastModel(): string {
  return process.env.GEMINI_MODEL_FAST || "gemini-3.5-flash-lite";
}

export function geminiVisionModel(): string {
  return process.env.GEMINI_MODEL_VISION || "gemini-3.8-flash";
}

// A summary the browser is allowed to see (true/false only, never the keys).
export type ServiceStatus = {
  supabase: boolean;
  ai: boolean;
  demoMode: boolean; // true when Supabase is missing → sample data is used
};

export function getServiceStatus(): ServiceStatus {
  // "ai" means at least one AI key is set, so real answers are possible.
  const ai = isGeminiConfigured() || isAnthropicConfigured();
  return {
    supabase: isSupabaseConfigured,
    ai,
    demoMode: !isSupabaseConfigured,
  };
}
