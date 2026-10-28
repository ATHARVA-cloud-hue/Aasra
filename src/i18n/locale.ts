import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/*
  WHICH LANGUAGE THIS REQUEST IS IN.

  Read from a cookie rather than from the URL. That is the whole reason
  the switcher could be added without touching a single route: /lawyers
  is /lawyers in all five languages, every existing link still works,
  and nothing that was bookmarked has broken.

  An unknown or missing cookie falls back to English rather than
  failing. A corrupted cookie must never produce a blank page.
*/
export async function getUserLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    // Read outside a request (a build-time render, say). English.
    return DEFAULT_LOCALE;
  }
}
