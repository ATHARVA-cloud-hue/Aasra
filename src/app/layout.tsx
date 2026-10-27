import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";

// Warm serif for headings — feels like a trusted letter.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Clean, very readable sans-serif for body text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "A calm, step-by-step guide for families in India claiming a loved one's bank accounts, insurance, EPF, shares and property.",
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
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
        <DemoModeBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
