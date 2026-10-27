"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/*
  UPLOAD A DOCUMENT, AND HAVE IT READ.

  The gentle version of data entry: a family photographs a death
  certificate or a passbook, and the fields fill themselves in.

  The flow, deliberately slow and reassuring:
    choose a file → "reading your document…" → "✓ we filled these in
    for you" → they correct anything that looks wrong → save.

  Nothing is saved until they press the button. The file itself is sent
  to our server, read, and forgotten — we keep only the details they
  confirm. The Gemini key lives on the server, never here.
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
    "unread"  — we could not read it, so the boxes start empty and the
                family types what they can see themselves
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
const EDITABLE: { key: keyof Fields; label: string; type?: "date" }[] = [
  { key: "person_name", label: "Their full name" },
  { key: "date_of_death", label: "Date of death", type: "date" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "place", label: "Town or city" },
  { key: "institution", label: "Bank, insurer or office named" },
  { key: "reference_number", label: "Account, policy or certificate number" },
];

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export function DocumentReader() {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setPhase({ name: "reading", fileName: file.name });

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/documents/read", { method: "POST", body });

      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as { error?: string } | null;
        setPhase({
          name: "error",
          message: problem?.error ?? "We could not read that file. Please try another photo.",
        });
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
        We could not read it. What happens next depends entirely on who
        is using the app, which is why this decision is made here and
        not on the server.

        A demo family gets the sample details, so the "we filled these
        in for you" moment still works on stage.

        A real family gets EMPTY boxes. Showing them the sample family's
        name and a made-up certificate number — pre-filled and one tap
        from being saved over their own father's details — would be a
        genuinely harmful thing to do, however well it demos.
      */
      const { getMode } = await import("@/lib/caseStore");

      if (getMode() === "demo") {
        const { DEMO_DOCUMENT_FIELDS } = await import("@/lib/demo");
        setPhase({ name: "review", fileName: file.name, fields: DEMO_DOCUMENT_FIELDS, source: "demo" });
      } else {
        setPhase({ name: "review", fileName: file.name, fields: EMPTY, source: "unread" });
      }
    } catch {
      // Offline, or the server went away. Never a red screen.
      setPhase({
        name: "error",
        message: "We could not reach our server just now. Your file has not been sent anywhere.",
      });
    }
  }

  function updateField(key: keyof Fields, value: string) {
    setPhase((current) =>
      current.name === "review" ? { ...current, fields: { ...current.fields, [key]: value } } : current,
    );
  }

  async function handleSave() {
    if (phase.name !== "review") return;
    const { fields, fileName } = phase;
    setPhase({ name: "saving", fileName, fields });

    /*
      The case store (and the whole Supabase library behind it) is only
      needed at this exact moment — the instant someone presses Save.
      Loading it here instead of at the top of the file keeps it out of
      this page's first render entirely: the page is quicker to open, and
      a problem inside the database layer can no longer stop the upload
      screen from appearing at all.
    */
    const { addAssets, getMode, recordDocument, saveCase } = await import("@/lib/caseStore");

    /*
      A demo walkthrough writes nothing.

      Without this, someone showing the app to a colleague as a demo
      family could press Save and put "Suresh Kumar Nair" and a made-up
      certificate number into a real family's case — the same mistake
      the intake form used to make, in a second place.
    */
    if (getMode() === "demo") {
      setPhase({ name: "saved", where: "demo", fields });
      return;
    }

    // Only send across what the family actually left filled in, so an
    // empty box never wipes an answer they gave in the wizard.
    const patch: Record<string, string> = {};
    if (fields.person_name) patch.deceased_name = fields.person_name;
    if (fields.date_of_death) patch.date_of_death = fields.date_of_death;
    if (fields.place) patch.place_of_death = fields.place;

    const outcome = Object.keys(patch).length > 0 ? await saveCase(patch) : { where: "device" as const };

    // A named bank or insurer on a document is an asset worth tracking.
    if (fields.institution || fields.reference_number) {
      await addAssets([
        {
          asset_type: fields.document_kind || "From a document",
          institution: fields.institution || null,
          details: [fields.reference_number, fields.extra_notes].filter(Boolean).join(" — ") || null,
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
          <p className="font-serif text-xl text-ink">A photo is enough</p>
          <p className="mt-2 text-ink-soft">
            Taken on a phone, a little crooked, in any language — we can work with that.
          </p>

          <label
            htmlFor="document-file"
            className="mt-6 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-sage-600 px-5 py-2.5 text-base font-medium text-white shadow-sm transition-colors duration-300 hover:bg-sage-700"
          >
            Choose a photo or PDF
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

          <p className="mt-4 text-sm text-ink-muted">
            A death certificate, bank passbook, insurance policy or Aadhaar card. Up to 15 MB.
          </p>
        </div>

        {phase.name === "error" && (
          <p className="mt-4 rounded-2xl bg-clay-50 px-4 py-3 text-sm text-clay-700" role="status">
            {phase.message} You can also just carry on without it.
          </p>
        )}
      </div>
    );
  }

  // ---- "Reading your document…" ----
  if (phase.name === "reading") {
    return (
      <div className="animate-fade-in rounded-2xl border border-line bg-cream px-6 py-10 text-center" role="status">
        <div className="mx-auto flex items-end justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-sage-400"
              style={{ animationDelay: `${dot * 160}ms`, animationDuration: "1.4s" }}
            />
          ))}
        </div>
        <p className="mt-5 font-serif text-xl text-ink">Reading your document…</p>
        <p className="mt-2 text-ink-soft">This takes a few seconds. Please stay on this page.</p>
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
          Added to your case
        </p>
        <p className="mt-2 text-sage-800">
          {phase.where === "supabase"
            ? "Saved safely. It will be here when you come back."
            : phase.where === "demo"
              ? "Though as a sample family, nothing was really saved."
              : "Saved on this device for now, so nothing is lost."}
        </p>
        <Button variant="secondary" className="mt-6" onClick={reset}>
          Read another document
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
          Honest about failing, and still useful: the boxes are empty and
          ready to type into, with the document in their hand.
        */
        <div className="rounded-2xl bg-clay-50 px-4 py-3">
          <p className="text-clay-700">We could not read that one</p>
          <p className="mt-1 text-sm text-clay-700">
            Nothing is wrong with your document — our reader was simply unable to make it out. You can type in
            whatever you can see below, or skip this entirely and carry on.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-sage-50 px-4 py-3">
          <p className="text-sage-800">
            <span aria-hidden="true">✓ </span>
            We filled these in for you
          </p>
          <p className="mt-1 text-sm text-sage-800">
            {phase.name === "review" && phase.source === "demo"
              ? "These are sample details for the demo — your document was not really read."
              : "Please glance over them. Change anything that looks wrong, and leave blank whatever we got wrong entirely."}
          </p>
        </div>
      )}

      {fields.document_kind && (
        <p className="mt-5 text-ink-soft">
          This looks like a <span className="text-ink">{fields.document_kind}</span>.
        </p>
      )}

      <div className="mt-5 space-y-5">
        {EDITABLE.map((item) => (
          <div key={item.key}>
            <label htmlFor={`doc-${item.key}`} className="text-base font-medium text-ink">
              {item.label}
            </label>
            <input
              id={`doc-${item.key}`}
              type={item.type === "date" ? "date" : "text"}
              value={fields[item.key]}
              disabled={busy}
              onChange={(event) => updateField(item.key, event.target.value)}
              placeholder="Not on this document"
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      {fields.extra_notes && (
        <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">{fields.extra_notes}</p>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSave} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Saving…" : "These look right — save them"}
        </Button>
        <Button variant="secondary" onClick={reset} disabled={busy} className="w-full sm:w-auto">
          Try a different file
        </Button>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        We keep only the details above. The photo itself is not stored.
      </p>
    </div>
  );
}
