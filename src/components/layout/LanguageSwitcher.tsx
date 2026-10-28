"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/actions";

/*
  THE LANGUAGE MENU.

  Every option is written in its own script, never translated. Somebody
  who has landed on a page in a language they cannot read has to be able
  to find their own language by recognising it, and "Hindi" is no use
  to a reader who only reads हिंदी.

  Choosing one writes the cookie through a server action and then calls
  router.refresh(). That re-renders the whole page on the server in the
  new language, header and footer included, with no navigation, so
  whatever the person was part way through filling in stays where it is.

  It is a plain button and a list rather than a <select>, because a
  native select on Android draws its options in the system font, which
  for a phone with no Gujarati font installed means five rows of boxes.
*/

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Escape closes the menu, wherever the cursor happens to be.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // A click anywhere else closes it.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !wrapRef.current?.contains(target)) setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function choose(locale: Locale) {
    setOpen(false);
    if (locale === active) return;

    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("current", { name: LOCALE_NAMES[active] })}
        className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 py-2 text-base text-ink-soft transition-colors duration-300 hover:bg-sage-50 hover:text-sage-800 disabled:opacity-50"
      >
        <GlobeMark />
        <span>{LOCALE_NAMES[active]}</span>
        <span aria-hidden="true" className="text-sm">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("choose")}
          /*
            Pinned to the end edge so it stays inside the window in both
            directions: end is the right in English and the left in Urdu.
          */
          className="animate-fade-in absolute end-0 z-50 mt-1 min-w-44 overflow-hidden rounded-2xl border border-line bg-paper py-1 shadow-lg"
        >
          {LOCALES.map((locale) => {
            const chosen = locale === active;

            return (
              <button
                key={locale}
                type="button"
                role="option"
                aria-selected={chosen}
                lang={locale}
                onClick={() => choose(locale)}
                className={
                  "flex min-h-12 w-full items-center gap-2 px-4 py-2.5 text-start text-base transition-colors duration-200 " +
                  (chosen ? "bg-sage-50 text-sage-800" : "text-ink hover:bg-cream")
                }
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-sage-700">
                  {chosen ? "✓" : ""}
                </span>
                {LOCALE_NAMES[locale]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* A small globe, so the control reads as a language picker at a glance. */
function GlobeMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
