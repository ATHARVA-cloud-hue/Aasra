import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/*
  next-intl is set up WITHOUT i18n routing: the chosen language lives in
  a cookie, not in the URL. Every route in the app is therefore
  unchanged, and every existing link and bookmark still works.

  The path is passed explicitly rather than relying on the plugin's
  default, so moving the file later fails loudly here instead of
  silently falling back to English everywhere.
*/
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  /*
    cacheComponents (partial prerendering) is deliberately OFF.

    It was on before the language switcher existed. The switcher keeps
    the chosen language in a cookie rather than in the URL, which is
    what let all five languages share one set of routes. But it also
    means the very first thing the root layout does is read a cookie,
    to decide the lang and dir attributes, the font, and which
    dictionary to hand the page.

    A page whose <html> element depends on a cookie cannot be
    prerendered into static HTML at build time. With cacheComponents on,
    Next.js correctly refuses to, and asks for either a Suspense
    boundary around the cookie read or `export const instant = false` on
    every route. Neither is available: the cookie is read above every
    page, not inside one, and a flag that has to be repeated on all
    fourteen routes is a trap for the fifteenth.

    So these pages are server-rendered per request, which is what
    cookie-based localisation means. To get prerendering back, the
    language would have to move into the URL (/hi/lawyers), and every
    existing route and bookmark would change.
  */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
