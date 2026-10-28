"use server";

import { cookies } from "next/headers";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/i18n/config";

/*
  CHANGING THE LANGUAGE.

  A server action, because writing a cookie is something only the
  server can do. The switcher calls this and then router.refresh(),
  which re-renders the page, header and footer included, in the new
  language without a navigation.

  Not httpOnly on purpose: there is nothing secret in a language
  choice, and leaving it readable means anything added later can see
  which language a page is in without another round trip.

  The value is checked against the five we have. An unexpected locale
  is ignored rather than written, so a bad request cannot leave
  somebody with a cookie that points at a dictionary we do not ship.
*/
export async function setUserLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();

  store.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}
