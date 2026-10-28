"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/*
  UPLOAD A DOCUMENT, AND HAVE IT READ.

  A family photographs a death certificate or a passbook, and the fields
  fill themselves in.

  The flow:
    choose a file -> "reading your document" -> "these details were
    filled in for you" -> correct anything wrong -> save.

  Nothing is saved until the button is pressed. The file itself is sent
  to our server, read, and forgotten. Only the details that are
  confirmed are kept. The Gemini key lives on the server, never here.
*/

type Fields = {
  document_kind: string;
  person_name: string;
  date_of_death: string;
  date_of_birth: string;
  place: string;
  institution: string;
  reference_number: string;
  extra_notes: string;
};

/*
  How the filled-in details came about:
    "gemini"  — the document really was read
    "demo"    — sample details, because this is a demo family
    "unread"  — it could not be read, so the boxes start empty and the
                family types what they can see
*/
type Source = "gemini" | "demo" | "unread";

type Phase =
  | { name: "idle" }
  | { name: "reading"; fileName: string }
  | { name: "review"; fileName: string; fields: Fields; source: Source }
  | { name: "saving"; fileName: string; fields: Fields }
  | { name: "saved"; where: "supabase" | "device" | "demo"; fields: Fields }
  | { name: "error"; message: string };

const EMPTY: Fields = {
  document_kind: "",
  person_name: "",
  date_of_death: "",
  date_of_birth: "",
  place: "",
  institution: "",
  reference_number: "",
  extra_notes: "",
};

/** The boxes shown for correcting, in the order a family reads them. */
const EDITABLE: { key: keyof Fields; type?: "date" }[] = [
  { key: "person_name" },
  { key: "date_of_death", type: "date" },
  { key: "date_of_birth", type: "date" },
  { key: "place" },
  { key: "institution" },
  { key: "reference_number" },
];

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export function DocumentReader() {
  const t = useTranslations("documents.reader");

  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setPhase({ name: "reading", fileName: file.name });

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/documents/read", { method: "POST", body });

      if (!response.ok) {
        setPhase({ name: "error", message: t("errorRead") });
        return;
      }

      const result = (await response.json()) as
        | { read: true; fields: Fields }
        | { read: false; reason: string };

      if (result.read) {
        setPhase({ name: "review", fileName: file.name, fields: result.fields, source: "gemini" });
        return;
      }

      /*
        It could not be read. What happens next depends entirely on who
        is using the app, which is why this decision is made here and
        not on the server.

        A demo family gets the sample details, so the "these details
        were filled in for you" moment still works on stage.

        A real family gets EMPTY boxes. Showing them the sample family's
        name and a made-up certificate number, pre-filled and one tap
        from being saved over their own father's details, would be a
        genuinely harmful thing to do however well it demos.
      */
      const { getMode } = await import("@/lib/caseStore");

      if (getMode() === "demo") {
        const { DEMO_DOCUMENT_FACTS } = await import("@/lib/demo");
        setPhase({
          name: "review",
          fileName: file.name,
          // The two sentence-shaped fields are translated; the rest are
          // names, dates and reference numbers, which are not.
          fields: {
            ...DEMO_DOCUMENT_FACTS,
            document_kind: t("demoKind"),
            extra_notes: t("demoNotes"),
          },
          source: "demo",
        });
      } else {
        setPhase({ name: "review", fileName: file.name, fields: EMPTY, source: "unread" });
      }
    } catch {
      // Offline, or the server went away. Never a red screen.
      setPhase({ name: "error", message: t("errorOffline") });
    }
  }

  function updateField(key: keyof Fields, value: string) {
    setPhase((current) =>
      current.name === "review"
        ? { ...current, fields: { ...current.fields, [key]: value } }
        : current,
    );
  }

  async function handleSave() {
    if (phase.name !== "review") return;
    const { fields, fileName } = phase;
    setPhase({ name: "saving", fileName, fields });

    /*
      The case store (and the whole Supabase library behind it) is only
      needed at this exact moment: the instant somebody presses Save.
      Loading it here instead of at the top of the file keeps it out of
      this page's first render entirely. The page is quicker to open,
      and a problem inside the database layer can no longer stop the
      upload screen from appearing at all.
    */
    const { addAssets, getMode, recordDocument, saveCase } = await import("@/lib/caseStore");

    /*
      A demo walkthrough writes nothing.

      Without this, somebody showing the app to a colleague as a demo
      family could press Save and put "Suresh Kumar Nair" and a made-up
      certificate number into a real family's case.
    */
    if (getMode() === "demo") {
      setPhase({ name: "saved", where: "demo", fields });
      return;
    }

    // Only send across what was actually left filled in, so an empty
    // box never wipes an answer given in the questions.
    const patch: Record<string, string> = {};
    if (fields.person_name) patch.deceased_name = fields.person_name;
    if (fields.date_of_death) patch.date_of_death = fields.date_of_death;
    if (fields.place) patch.place_of_death = fields.place;

    const outcome =
      Object.keys(patch).length > 0 ? await saveCase(patch) : { where: "device" as const };

    // A named bank or insurer on a document is an asset worth tracking.
    if (fields.institution || fields.reference_number) {
      await addAssets([
        {
          asset_type: fields.document_kind || "From a document",
          institution: fields.institution || null,
          details: [fields.reference_number, fields.extra_notes].filter(Boolean).join(". ") || null,
          source: "family",
        },
      ]);
    }

    await recordDocument({
      doc_type: fields.document_kind || "Document",
      original_name: fileName,
      extracted: fields,
    });

    setPhase({ name: "saved", where: outcome.where, fields });
  }

  function reset() {
    setPhase({ name: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  // ---- The drop zone, shown whenever we are not mid-flow ----
  if (phase.name === "idle" || phase.name === "error") {
    return (
      <div>
        <div className="rounded-2xl border-2 border-dashed border-line bg-cream px-6 py-10 text-center">
          <p className="font-serif text-xl text-ink">{t("dropTitle")}</p>
          <p className="mt-2 text-ink-soft">{t("dropBody")}</p>

          <label
            htmlFor="document-file"
            className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-sage-600 px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors duration-300 hover:bg-sage-700"
          >
            {t("choose")}
          </label>
          <input
            ref={inputRef}
            id="document-file"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <p className="mt-4 text-sm text-ink-muted">{t("limits")}</p>
        </div>

        {phase.name === "error" && (
          <p className="mt-4 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="status">
            {phase.message} {t("errorSuffix")}
          </p>
        )}
      </div>
    );
  }

  // ---- "Reading your document" ----
  if (phase.name === "reading") {
    return (
      <div
        className="animate-fade-in rounded-2xl border border-line bg-cream px-6 py-10 text-center"
        role="status"
      >
        <div className="mx-auto flex items-end justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-sage-400"
              style={{ animationDelay: `${dot * 160}ms`, animationDuration: "1.4s" }}
            />
          ))}
        </div>
        <p className="mt-5 font-serif text-xl text-ink">{t("readingTitle")}</p>
        <p className="mt-2 text-ink-soft">{t("readingBody")}</p>
        <p className="mt-4 text-sm text-ink-muted">{phase.fileName}</p>
      </div>
    );
  }

  // ---- Saved ----
  if (phase.name === "saved") {
    return (
      <div className="animate-fade-in rounded-2xl border border-sage-200 bg-sage-50 px-6 py-8 text-center">
        <p className="font-serif text-xl text-sage-800">
          <span aria-hidden="true">✓ </span>
          {t("savedTitle")}
        </p>
        <p className="mt-2 text-sage-800">
          {phase.where === "supabase"
            ? t("savedSupabase")
            : phase.where === "demo"
              ? t("savedDemo")
              : t("savedDevice")}
        </p>
        <Button variant="secondary" className="mt-6" onClick={reset}>
          {t("readAnother")}
        </Button>
      </div>
    );
  }

  // ---- Review and correct ----
  const { fields, name } = phase;
  const busy = name === "saving";

  return (
    <div className="animate-fade-in">
      {phase.name === "review" && phase.source === "unread" ? (
        /*
          Honest about failing, and still useful: the boxes are empty
          and ready to type into, with the document in hand.
        */
        <div className="rounded-2xl bg-clay-50 px-4 py-3">
          <p className="text-clay-700">{t("unreadTitle")}</p>
          <p className="mt-1 text-sm text-clay-700">{t("unreadBody")}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-sage-50 px-4 py-3">
          <p className="text-sage-800">
            <span aria-hidden="true">✓ </span>
            {t("filledTitle")}
          </p>
          <p className="mt-1 text-sm text-sage-800">
            {phase.name === "review" && phase.source === "demo"
              ? t("filledDemo")
              : t("filledBody")}
          </p>
        </div>
      )}

      {fields.document_kind && (
        <p className="mt-5 text-ink-soft">{t("looksLike", { kind: fields.document_kind })}</p>
      )}

      <div className="mt-5 space-y-5">
        {EDITABLE.map((item) => (
          <div key={item.key}>
            <label htmlFor={`doc-${item.key}`} className="text-base font-medium text-ink">
              {t(`fields.${item.key}`)}
            </label>
            <input
              id={`doc-${item.key}`}
              type={item.type === "date" ? "date" : "text"}
              value={fields[item.key]}
              disabled={busy}
              onChange={(event) => updateField(item.key, event.target.value)}
              placeholder={t("notOnDocument")}
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      {fields.extra_notes && (
        <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
          {fields.extra_notes}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSave} disabled={busy} className="w-full sm:w-auto">
          {busy ? t("saving") : t("save")}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={busy} className="w-full sm:w-auto">
          {t("tryAnother")}
        </Button>
      </div>

      <p className="mt-4 text-sm text-ink-muted">{t("keepOnly")}</p>
    </div>
  );
}
