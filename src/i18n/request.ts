import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getUserLocale } from "@/i18n/locale";

/*
  WHAT next-intl ASKS FOR ON EVERY REQUEST.

  Wired up by the plugin in next.config.ts. Both the server
  (getTranslations) and the browser (useTranslations, through the
  provider in layout.tsx) end up reading whatever this returns.

  If a dictionary is missing or will not parse, English is loaded
  instead. That matters more than it looks: a syntax error in, say,
  gu.json would otherwise take down every page for every Gujarati
  reader, and a half-translated page is a great deal better than none.
*/
export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  try {
    return {
      locale,
      messages: (await import(`../../messages/${locale}.json`)).default,
    };
  } catch (error) {
    console.error(`Could not load the ${locale} dictionary, falling back to English:`, error);

    return {
      locale: DEFAULT_LOCALE,
      messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
    };
  }
});
