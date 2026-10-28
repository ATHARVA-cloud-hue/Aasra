/*
  THE FIVE LANGUAGES, AND NOTHING ELSE ABOUT THEM.

  This file is deliberately free of imports. It is read by the server
  (to pick a dictionary), by the browser (to draw the language menu)
  and by the Tailwind layer indirectly through the lang attribute, so
  it must stay cheap enough to pull into any of them.

  Adding a sixth language means: add it to LOCALES, add its own-script
  name to LOCALE_NAMES, add messages/<code>.json, and add a font rule
  in globals.css if it needs a different script.
*/

export const LOCALES = ["en", "hi", "mr", "gu", "ur"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/*
  The cookie the chosen language is kept in. NEXT_LOCALE is the name
  next-intl and Next.js both use by convention, so anything else added
  later will look in the right place.
*/
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** A year. Long enough that nobody has to choose their language twice. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/*
  Each language named in its own script.

  Never translated, and identical in all five dictionaries, which is
  why it lives here rather than in the message files: somebody who has
  landed on a page in a language they cannot read needs to find their
  own language in the menu by recognising it, not by reading English.
*/
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  gu: "ગુજરાતી",
  ur: "اردو",
};

/** Written right to left. Urdu is the only one here, for now. */
const RTL_LOCALES: readonly Locale[] = ["ur"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** What to put in the dir attribute on <html>. */
export function directionFor(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}
