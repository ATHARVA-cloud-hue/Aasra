"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { onOpenChat } from "@/lib/chatBus";

/*
  THE LITTLE CHAT BUTTON.

  Mounted once in the root layout, so it sits quietly in the corner of
  every page — the landing page and the lawyer panel included, not just
  the journey. Someone halfway through a form, stuck on a word a bank
  used, can ask without losing their place or feeling they are
  bothering anyone.

  Anywhere else that should open it calls openChat() from
  src/lib/chatBus.ts rather than rendering a second copy of this panel.

  Deliberate choices:
  - It starts closed and small. Nothing pops open at a grieving person.
  - Three suggested questions, because "ask me anything" is paralysing
    when you do not yet know what you do not know.
  - A way through to a real human is always visible inside the panel.
    The assistant is a first answer, not a replacement for a person.
  - Escape closes it, focus moves to the box when it opens, and the
    reply is announced to screen readers when it arrives.
*/

type Message = { role: "user" | "model"; text: string };

/** Keys under chat.suggestions. */
const SUGGESTIONS = ["one", "two", "three"];

export function ChatAssistant() {
  const t = useTranslations("chat");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Anything anywhere in the app can ask for the panel — see chatBus.ts.
  useEffect(() => onOpenChat(() => setOpen(true)), []);

  // Escape closes the panel, wherever the cursor happens to be.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Put the cursor in the box as soon as it opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending, open]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    // Show their question straight away, and remember what came before
    // so the assistant can follow the thread.
    const history = messages;
    setMessages([...history, { role: "user", text }]);
    setDraft("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /*
          The language goes with the question so the assistant answers
          in it, and so the pre-written fallbacks come back in the
          right language when no AI key is set.
        */
        body: JSON.stringify({ message: text, history, locale }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      setMessages((current) => [
        ...current,
        {
          role: "model",
          text: data.reply ?? data.error ?? t("errorServer"),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "model",
          text: t("errorNetwork"),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  // ---- Closed: just the button ----
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("launch")}
        className="fixed bottom-5 end-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-base font-medium text-white shadow-lg transition-colors duration-300 hover:bg-sage-700"
      >
        <span aria-hidden="true">?</span>
        {t("launch")}
      </button>
    );
  }

  // ---- Open: the panel ----
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={t("panelTitle")}
      className="animate-fade-in fixed inset-x-3 bottom-3 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[25rem]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-serif text-lg text-ink">{t("panelTitle")}</p>
          <p className="text-sm text-ink-muted">{t("panelSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("close")}
          className="shrink-0 rounded-xl px-3 py-2 text-xl leading-none text-ink-muted transition-colors hover:bg-cream hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-ink-soft">{t("greeting")}</p>

        {messages.length === 0 && (
          <div className="mt-4 space-y-2">
            {SUGGESTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => void send(t(`suggestions.${key}`))}
                className="block w-full rounded-2xl border border-sage-200 bg-paper px-4 py-2.5 text-start text-base text-sage-800 transition-colors hover:border-sage-400 hover:bg-sage-50"
              >
                {t(`suggestions.${key}`)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3" aria-live="polite">
          {messages.map((message, index) => (
            <p
              key={index}
              className={
                message.role === "user"
                  ? "ms-6 rounded-2xl bg-sage-600 px-4 py-2.5 text-white"
                  : "me-6 rounded-2xl bg-cream px-4 py-2.5 text-ink"
              }
            >
              {message.text}
            </p>
          ))}

          {pending && (
            <p className="me-6 rounded-2xl bg-cream px-4 py-2.5 text-ink-muted" role="status">
              {t("thinking")}
            </p>
          )}
        </div>

        <div ref={endRef} />
      </div>

      <form
        className="border-t border-line px-5 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("inputPlaceholder")}
            aria-label={t("inputLabel")}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-cream px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-sage-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="min-h-12 shrink-0 rounded-2xl bg-sage-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("send")}
          </button>
        </div>

        <p className="mt-3 text-sm text-ink-muted">
          {t("disclaimer")}{" "}
          <Link
            href="/lawyers"
            onClick={() => setOpen(false)}
            className="text-sage-700 underline underline-offset-4"
          >
            {tNav("talkToLawyer")}
          </Link>
        </p>
      </form>
    </div>
  );
}
