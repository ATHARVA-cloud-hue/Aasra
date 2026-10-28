import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { directionFor } from "@/i18n/config";
import { getUserLocale } from "@/i18n/locale";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";
import { ChatAssistant } from "@/components/chat/ChatAssistant";

/*
  FONTS, ONE SCRIPT AT A TIME.

  The Latin fonts cannot draw Devanagari, Gujarati or Nastaliq at all:
  in those languages every character would come out as a box. So all
  five families are loaded and the variables are swapped per language
  in globals.css, keyed off the lang attribute set below.

  Only the font files for the script actually in use are fetched by the
  browser, because a font is only downloaded when something on the page
  asks for that family.
*/

// Warm serif for English headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Clean, very readable sans-serif for English body text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Hindi and Marathi.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
});

// Gujarati.
const notoGujarati = Noto_Sans_Gujarati({
  variable: "--font-gujarati",
  subsets: ["gujarati"],
});

/*
  Urdu. Nastaliq is a calligraphic, steeply sloped script: it needs far
  more line height than a Latin face, which globals.css gives it.

  Only two weights are published, and the variable axis is not, so the
  weight has to be named explicitly here.
*/
const notoNastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const FONT_VARIABLES = [
  fraunces.variable,
  inter.variable,
  notoDevanagari.variable,
  notoGujarati.variable,
  notoNastaliq.variable,
].join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");

  return {
    title: `${t("name")} — ${t("tagline")}`,
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  /*
    The language for this request comes from the cookie. It decides
    three things on the html element: which dictionary the provider
    hands to the browser, which font the stylesheet picks, and which
    way round the page is laid out.
  */
  const locale = await getUserLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={directionFor(locale)}
      className={`${FONT_VARIABLES} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning: browser extensions such as Grammarly,
        password managers and dark-mode tools inject their own attributes
        onto <html>/<body> before React hydrates. Those injected attributes
        are harmless but would otherwise trip React's "server HTML didn't
        match client" warning. This suppresses that one warning for these
        two elements only — it does NOT hide real hydration bugs inside the
        app, which still warn as normal.
      */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DemoModeBanner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />

          {/*
            Mounted once, here, so the "Ask a question" button is in the
            corner of every page — not only the journey. Anywhere that
            wants to open it calls openChat() from src/lib/chatBus.ts.
          */}
          <ChatAssistant />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
