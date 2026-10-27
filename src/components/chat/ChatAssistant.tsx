"use client";

import { useEffect, useRef, useState } from "react";
import { whatsappLink } from "@/lib/config";

/*
  THE LITTLE CHAT BUTTON.

  Sits quietly in the corner of every page in the journey. Someone
  halfway through a form, stuck on a word a bank used, can ask without
  losing their place or feeling they are bothering anyone.

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

const GREETING =
  "Ask me anything about claiming what your family is owed — what a document means, what a bank will want, or " +
  "simply what to do next.";

const SUGGESTIONS = [
  "What is a succession certificate?",
  "What do I do first?",
  "Which documents does a bank need?",
];

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ message: text, history }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      setMessages((current) => [
        ...current,
        {
          role: "model",
          text:
            data.reply ??
            data.error ??
            "Something went wrong at our end. Please try again, or talk to one of us instead.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "model",
          text:
            "I could not reach our server just then — it may be your connection. Please try again in a moment.",
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
        aria-label="Ask a question"
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sage-600 px-5 py-3 text-base font-medium text-white shadow-lg transition-colors duration-300 hover:bg-sage-700"
      >
        <span aria-hidden="true">?</span>
        Ask a question
      </button>
    );
  }

  // ---- Open: the panel ----
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Ask a question"
      className="animate-fade-in fixed inset-x-3 bottom-3 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[25rem]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-serif text-lg text-ink">Ask a question</p>
          <p className="text-sm text-ink-muted">Plain answers, any time of night.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="shrink-0 rounded-xl px-3 py-2 text-xl leading-none text-ink-muted transition-colors hover:bg-cream hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-ink-soft">{GREETING}</p>

        {messages.length === 0 && (
          <div className="mt-4 space-y-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="block w-full rounded-2xl border border-sage-200 bg-paper px-4 py-2.5 text-left text-base text-sage-800 transition-colors hover:border-sage-400 hover:bg-sage-50"
              >
                {suggestion}
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
                  ? "ml-6 rounded-2xl bg-sage-600 px-4 py-2.5 text-white"
                  : "mr-6 rounded-2xl bg-cream px-4 py-2.5 text-ink"
              }
            >
              {message.text}
            </p>
          ))}

          {pending && (
            <p className="mr-6 rounded-2xl bg-cream px-4 py-2.5 text-ink-muted" role="status">
              Thinking…
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
            placeholder="Type your question…"
            aria-label="Your question"
            className="min-h-12 flex-1 rounded-2xl border border-line bg-cream px-4 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-sage-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="min-h-12 shrink-0 rounded-2xl bg-sage-600 px-4 py-2.5 text-base font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <p className="mt-3 text-sm text-ink-muted">
          Guidance, not legal advice — a lawyer checks anything legal.{" "}
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sage-700 underline underline-offset-4"
          >
            Talk to a person
          </a>
        </p>
      </form>
    </div>
  );
}
