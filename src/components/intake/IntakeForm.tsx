"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IntakeField, IntakeStep } from "@/lib/journey";
import {
  getMode,
  loadCase,
  readChoices,
  saveCase,
  saveChoices,
  type CaseRecord,
} from "@/lib/caseStore";
import { DEMO_CASE } from "@/lib/demo";

/*
  THE QUESTIONS, AND HOW THEY SAVE.

  How saving works, and why it is built this way:

  - Every answer is saved as soon as you leave the box (on blur), and
    also a moment after you stop typing. Pressing "Continue" takes the
    cursor out of the box, which counts as leaving it, so moving to the
    next question always saves first.

  - saveCase() writes to this device the instant it is called, and only
    then tries the database. That ordering matters: even if the laptop
    loses wifi halfway through a sentence, or the family closes the page
    the moment they finish typing, the words are already kept.

  - Returning to a question shows what was typed before, because the
    saved case is loaded when the screen opens.

  Nothing here can show an error to the family. The worst that happens
  is the small grey line underneath saying "Saved on this device".

  The words come from messages/*.json. Everything under
  intake.steps.<slug>.fields.<column> belongs to one question; the
  shared wording is under intake.save and the option labels.
*/

/** How long after the last keystroke the answer is saved, in milliseconds. */
const TYPING_PAUSE = 800;

/*
  Turn a pressed button into something a true/false column can hold.
  "Not sure" deliberately becomes null — an honest "we do not know" —
  rather than being rounded down to No, which would quietly tell the
  heir calculation something the family never said.
*/
function toYesNo(choice: string): boolean | null {
  if (choice === "yes") return true;
  if (choice === "no") return false;
  return null;
}

/** And back again, to work out which button should look pressed. */
function fromYesNo(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

type SaveState = "idle" | "loading" | "saving" | "saved" | "device" | "demo";

export function IntakeForm({ step }: { step: IntakeStep }) {
  /*
    Three namespaces. `t` is the shared wording, `tStep` is this one
    question's own labels and notes, and `tRoot` resolves an option
    list that may live under either intake.options or religion.options.
  */
  const t = useTranslations("intake");
  const tStep = useTranslations(`intake.steps.${step.slug}.fields`);
  const tRoot = useTranslations();

  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>("loading");

  // What was last sent, so the same thing is never saved twice.
  const savedRef = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Used to ignore a slow load that finishes after the family has typed.
  const typedRef = useRef(false);

  /*
    The newest answers, readable without re-running effects.

    This exists for a specific reason. The "page is closing" listener
    below must always see the latest text, but if it were fed `values`
    directly, React would tear down and rebuild that listener on every
    single keystroke — and its clean-up step would fire a save each
    time, defeating the whole point of waiting for a typing pause.
    Reading from a ref keeps the listener set up once and still current.
  */
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  /*
    The current question, held the same way and for the same reason.
    Saving needs to know which answers are buttons and which are text,
    but if the save function depended on the question object directly it
    would be rebuilt whenever the server re-sent this page — and that
    would tear down the "page is closing" listener below with it.
  */
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  /*
    Whether this is a demo walkthrough, held in a ref for the same
    reason — saving must be able to check it without being rebuilt.

    This check closes two holes that mattered. Without it, a visitor
    choosing "Continue as a demo family" would be shown the previous
    real family's answers loaded into these very boxes, and anything
    then typed would be written straight over that family's saved case.
    In demo mode the sample family is prefilled and every edit is kept
    in memory, so a demo cannot read or touch real answers.
  */
  const demoRef = useRef(false);

  // ---- Bring back whatever was answered before ----
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const demo = getMode() === "demo";
      demoRef.current = demo;

      // In demo mode the real case is never read, not even to ignore it.
      const record = demo ? DEMO_CASE : (await loadCase()).record;
      if (cancelled) return;

      const remembered = demo ? {} : readChoices();
      const existing: Record<string, string> = {};

      for (const field of step.fields) {
        const value = record[field.name as keyof CaseRecord];

        if (field.savesAsYesNo) {
          /*
            Prefer the button that was actually pressed. Only fall back
            to the saved true/false if this device has forgotten. Then a
            family on a new phone still sees Yes or No correctly, just
            not "Not sure".
          */
          existing[field.name] = remembered[field.name] ?? fromYesNo(value);
        } else {
          existing[field.name] = typeof value === "string" ? value : "";
        }
      }

      savedRef.current = { ...existing };

      // If they started typing while this was loading, their words win.
      if (!typedRef.current) setValues(existing);
      setState(demo ? "demo" : "idle");
    })();

    return () => {
      cancelled = true;
    };
    /*
      Keyed on the question's slug rather than the whole step object.
      The step arrives from the server on every render as a fresh object,
      so depending on it directly would reload the saved answers far
      more often than the family ever changes question.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.slug]);

  // ---- Saving ----
  const flush = useCallback(
    async (next: Record<string, string>) => {
      // Only the answers that have actually changed.
      const changed: Record<string, string> = {};
      for (const [key, value] of Object.entries(next)) {
        if (savedRef.current[key] !== value) changed[key] = value;
      }
      if (Object.keys(changed).length === 0) return;

      // Mark as sent straight away, so a blur and a typing pause landing
      // together cannot send the same answer twice.
      savedRef.current = { ...savedRef.current, ...changed };
      setState("saving");

      /*
        Build what the database actually receives. Text goes across as
        typed; a pressed button becomes true, false or unknown.
      */
      const patch: Record<string, string | boolean | null> = {};
      const buttons: Record<string, string> = {};

      for (const [key, value] of Object.entries(changed)) {
        const field = stepRef.current.fields.find((candidate) => candidate.name === key);
        if (field?.savesAsYesNo) {
          patch[key] = toYesNo(value);
          buttons[key] = value;
        } else {
          patch[key] = value;
        }
      }

      // A demo walkthrough is never written down anywhere.
      if (demoRef.current) {
        setState("demo");
        return;
      }

      // Remember the exact buttons, so returning here looks right.
      if (Object.keys(buttons).length > 0) saveChoices(buttons);

      const outcome = await saveCase(patch as CaseRecord);
      setState(outcome.where === "supabase" ? "saved" : "device");
    },
    // Reads the question from a ref, so this never needs rebuilding.
    [],
  );

  function handleChange(field: IntakeField, value: string) {
    typedRef.current = true;
    const next = { ...values, [field.name]: value };
    setValues(next);

    if (timerRef.current) clearTimeout(timerRef.current);

    // Pressing a button is a finished decision, so save it at once.
    // Typing is not, so wait for a pause in case they are mid-word.
    if (field.kind === "choice") {
      void flush(next);
    } else {
      timerRef.current = setTimeout(() => void flush(next), TYPING_PAUSE);
    }
  }

  function handleBlur() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush(values);
  }

  // ---- Last chance: the page is closing, or the phone is locked ----
  useEffect(() => {
    function saveNow() {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush(valuesRef.current);
    }

    function saveIfHiding() {
      // visibilitychange fires when coming back too; only act on leaving.
      if (document.visibilityState === "hidden") saveNow();
    }

    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", saveIfHiding);

    return () => {
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", saveIfHiding);
      // Leaving this question — make sure the last words are kept.
      saveNow();
    };
    // flush never changes, so this is set up once and torn down once.
  }, [flush]);

  const box =
    "mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink " +
    "placeholder:text-ink-muted focus:border-sage-400";

  /*
    Not every box has example text, and a question that has none must
    not show its own key instead. t.has() asks the dictionary, rather
    than keeping a second list here of which fields have a placeholder.
  */
  function optionalText(field: IntakeField, part: "placeholder" | "note"): string | undefined {
    const key = `${field.name}.${part}`;
    return tStep.has(key) ? tStep(key) : undefined;
  }

  return (
    <div className="space-y-6">
      {step.fields.map((field) =>
        field.kind === "choice" ? (
          <ChoiceField
            key={field.name}
            field={field}
            label={tStep(`${field.name}.label`)}
            note={optionalText(field, "note")}
            optionLabel={(option) => tRoot(`${field.optionsNamespace}.${option}`)}
            value={values[field.name] ?? ""}
            onPick={(value) => handleChange(field, value)}
          />
        ) : (
          <div key={field.name}>
            <label htmlFor={field.name} className="text-base font-medium text-ink">
              {tStep(`${field.name}.label`)}
            </label>

            {optionalText(field, "note") && (
              <p className="mt-1 text-sm text-ink-muted">{optionalText(field, "note")}</p>
            )}

            {field.kind === "long" ? (
              <textarea
                id={field.name}
                name={field.name}
                rows={3}
                placeholder={optionalText(field, "placeholder")}
                value={values[field.name] ?? ""}
                onChange={(event) => handleChange(field, event.target.value)}
                onBlur={handleBlur}
                className={box}
              />
            ) : (
              <input
                id={field.name}
                name={field.name}
                type={field.kind === "date" ? "date" : "text"}
                placeholder={optionalText(field, "placeholder")}
                value={values[field.name] ?? ""}
                onChange={(event) => handleChange(field, event.target.value)}
                onBlur={handleBlur}
                className={box}
              />
            )}
          </div>
        ),
      )}

      <p className="text-sm text-ink-muted" role="status" aria-live="polite">
        {state === "saved" && <span aria-hidden="true">✓ </span>}
        {t(`save.${state}`)}
      </p>
    </div>
  );
}

/*
  A "choose one" question, drawn as soft pills.

  Under the pills these are ordinary radio buttons, hidden from view but
  not from screen readers or the keyboard — so arrow keys move between
  the options and the question is announced properly. A row of plain
  <button>s would look identical and be far worse to use for anyone not
  using a mouse.
*/
function ChoiceField({
  field,
  label,
  note,
  optionLabel,
  value,
  onPick,
}: {
  field: IntakeField;
  label: string;
  note?: string;
  optionLabel: (option: string) => string;
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="text-base font-medium text-ink">{label}</legend>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {(field.options ?? []).map((option) => {
          const chosen = value === option;
          return (
            <label
              key={option}
              className={
                "min-h-12 cursor-pointer rounded-2xl border px-4 py-2.5 text-base transition-colors duration-200 " +
                "flex items-center focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 " +
                "focus-within:outline-sage-400 " +
                (chosen
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-sage-200 bg-paper text-sage-800 hover:border-sage-400 hover:bg-sage-50")
              }
            >
              <input
                type="radio"
                name={field.name}
                value={option}
                checked={chosen}
                onChange={() => onPick(option)}
                className="sr-only"
              />
              {optionLabel(option)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
