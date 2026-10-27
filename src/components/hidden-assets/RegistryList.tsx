"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ALSO_WORTH_CHECKING, REGISTRIES, type Registry } from "@/lib/registries";

/*
  THE OFFICIAL SEARCHES, ONE AT A TIME.

  Each registry gets its own card: what it is, why it is worth looking,
  a button to the real site, and a box to tell us what was found.

  Why a family has to search themselves: these portals need the
  person's own identity details, and no honest service asks you to hand
  those over so it can "look for you". So we explain where to look, and
  take whatever they come back with.

  A find is saved as an asset with source "discovered", which is what
  lets the case page say "we found this" rather than "you told us".
*/

type Status = "idle" | "saving" | "supabase" | "device" | "demo";

export function RegistryList() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, Status>>({});

  async function report(registry: Registry) {
    const note = (notes[registry.id] ?? "").trim();
    if (!note) return;

    setStatus((current) => ({ ...current, [registry.id]: "saving" }));

    const { addAssets, getMode } = await import("@/lib/caseStore");

    /*
      In demo mode we deliberately do not write anything.

      Someone may well walk the real journey, then come back and click
      through as a demo family to show a colleague. If demo clicks wrote
      to the database, they would land in that person's real case — and
      a made-up bank account appearing in a genuine inheritance claim is
      not a mess we are willing to risk.
    */
    if (getMode() === "demo") {
      setStatus((current) => ({ ...current, [registry.id]: "demo" }));
      setNotes((current) => ({ ...current, [registry.id]: "" }));
      return;
    }

    const outcome = await addAssets([
      {
        asset_type: registry.assetType,
        institution: registry.where,
        details: note,
        source: "discovered",
      },
    ]);

    setStatus((current) => ({
      ...current,
      [registry.id]: outcome.where === "supabase" ? "supabase" : "device",
    }));
    setNotes((current) => ({ ...current, [registry.id]: "" }));
  }

  return (
    <>
      {/* Said once, at the top, before anyone clicks anything. */}
      <Card>
        <h2 className="text-xl">How this part works</h2>
        <p className="mt-3 text-ink-soft">
          Four official searches, each on a government or regulator site. You run them yourself, in your own browser —
          we open the right page and tell you what to look for.
        </p>
        <p className="mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-sage-800">
          We will never ask you for a password, a PIN, or a one-time code. Nobody honest needs those to look for money
          that belongs to your family. If any service asks you for them, walk away.
        </p>
        <p className="mt-4 text-ink-soft">
          Found something? Type it into the box underneath that search and it joins your case, so you never have to
          remember it again.
        </p>
      </Card>

      {REGISTRIES.map((registry, index) => (
        <Card key={registry.id} className="mt-5">
          <p className="text-sm text-ink-muted">
            Search {index + 1} of {REGISTRIES.length}
          </p>

          <h2 className="mt-2 text-xl">{registry.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">{registry.where}</p>

          <p className="mt-4 text-ink-soft">{registry.what}</p>
          <p className="mt-3 text-ink-soft">{registry.why}</p>

          <Button
            href={registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full sm:w-auto"
          >
            Open the official site
          </Button>

          {/* Shown in full so it can be checked before clicking. */}
          <p className="mt-3 break-all text-sm text-ink-muted">
            Opens in a new tab: {registry.url}
          </p>

          <div className="mt-7 border-t border-line pt-6">
            <label htmlFor={`found-${registry.id}`} className="text-base font-medium text-ink">
              Did you find anything? Tell us here.
            </label>
            <p className="mt-1 text-sm text-ink-muted">
              Whatever you can see is enough — a bank name, an amount, a reference number.
            </p>

            <textarea
              id={`found-${registry.id}`}
              rows={3}
              value={notes[registry.id] ?? ""}
              placeholder={registry.placeholder}
              disabled={status[registry.id] === "saving"}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [registry.id]: event.target.value }))
              }
              className="mt-3 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="secondary"
                disabled={!(notes[registry.id] ?? "").trim() || status[registry.id] === "saving"}
                onClick={() => void report(registry)}
                className="w-full sm:w-auto"
              >
                {status[registry.id] === "saving" ? "Adding…" : "Add this to my case"}
              </Button>

              <ReportNote status={status[registry.id] ?? "idle"} />
            </div>
          </div>
        </Card>
      ))}

      <Card className="mt-5">
        <h2 className="text-xl">Also worth a look</h2>
        <p className="mt-2 text-ink-soft">
          Two more places families often find something. We have not put buttons here yet, because we would rather
          send you nowhere than send you to the wrong address.
        </p>
        <ul className="mt-5 space-y-4">
          {ALSO_WORTH_CHECKING.map((item) => (
            <li key={item.name} className="border-l-2 border-sage-200 pl-4">
              <p className="text-ink">
                {item.name} <span className="text-ink-muted">· {item.where}</span>
              </p>
              <p className="mt-1 text-ink-soft">{item.why}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function ReportNote({ status }: { status: Status }) {
  if (status === "idle" || status === "saving") return null;

  const message =
    status === "supabase"
      ? "Added to your case."
      : status === "device"
        ? "Added, and kept on this device for now."
        : "Added — though in demo mode nothing is really saved.";

  return (
    <p className="text-sm text-sage-800" role="status">
      <span aria-hidden="true">✓ </span>
      {message}
    </p>
  );
}
