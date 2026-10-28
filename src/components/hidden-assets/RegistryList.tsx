"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ALSO_WORTH_CHECKING, REGISTRIES, type Registry } from "@/lib/registries";

/*
  THE OFFICIAL SEARCHES, ONE AT A TIME.

  Each registry gets its own card: what it is, why it is worth looking,
  a button to the real site, and a box to report what was found.

  Why a family has to search themselves: these portals need the
  person's own identity details, and no honest service asks you to hand
  those over so it can "look for you". So the app explains where to
  look, and takes whatever comes back.

  A find is saved as an asset with source "discovered", which is what
  lets the case page say "found by the app" rather than "entered by you".
*/

type Status = "idle" | "saving" | "supabase" | "device" | "demo";

export function RegistryList() {
  const t = useTranslations("hiddenAssets");

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, Status>>({});

  async function report(registry: Registry) {
    const note = (notes[registry.id] ?? "").trim();
    if (!note) return;

    setStatus((current) => ({ ...current, [registry.id]: "saving" }));

    const { addAssets, getMode } = await import("@/lib/caseStore");

    /*
      In demo mode nothing is written, deliberately.

      Someone may well walk the real steps, then return and click
      through as a demo family to show a colleague. If demo clicks wrote
      to the database, they would land in that person's real case, and
      a made-up bank account appearing in a genuine inheritance claim is
      not a mess worth risking.
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
        <h2 className="text-xl">{t("howTitle")}</h2>
        <p className="mt-3 text-ink-soft">{t("howBody")}</p>
        <p className="mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-sage-800">{t("safety")}</p>
        <p className="mt-4 text-ink-soft">{t("howFound")}</p>
      </Card>

      {REGISTRIES.map((registry, index) => (
        <Card key={registry.id} className="mt-5">
          <p className="text-sm text-ink-muted">
            {t("searchCounter", { current: index + 1, total: REGISTRIES.length })}
          </p>

          <h2 className="mt-2 text-xl">{t(`registries.${registry.id}.name`)}</h2>
          {/* The institution's own name, so lang="en" keeps it in the Latin face. */}
          <p className="mt-1 text-sm text-ink-muted" lang="en">
            {registry.where}
          </p>

          <p className="mt-4 text-ink-soft">{t(`registries.${registry.id}.what`)}</p>
          <p className="mt-3 text-ink-soft">{t(`registries.${registry.id}.why`)}</p>

          <Button
            href={registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full sm:w-auto"
          >
            {t("openSite")}
          </Button>

          {/* Shown in full so it can be checked before clicking. */}
          <p className="mt-3 break-all text-sm text-ink-muted">
            {t("opensInNewTab", { url: registry.url })}
          </p>

          <div className="mt-7 border-t border-line pt-6">
            <label htmlFor={`found-${registry.id}`} className="text-base font-medium text-ink">
              {t("foundLabel")}
            </label>
            <p className="mt-1 text-sm text-ink-muted">{t("foundHelp")}</p>

            <textarea
              id={`found-${registry.id}`}
              rows={3}
              value={notes[registry.id] ?? ""}
              placeholder={t(`registries.${registry.id}.placeholder`)}
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
                {status[registry.id] === "saving" ? t("adding") : t("addToCase")}
              </Button>

              <ReportNote status={status[registry.id] ?? "idle"} />
            </div>
          </div>
        </Card>
      ))}

      <Card className="mt-5">
        <h2 className="text-xl">{t("alsoTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("alsoBody")}</p>
        <ul className="mt-5 space-y-4">
          {ALSO_WORTH_CHECKING.map((item) => (
            <li key={item.id} className="border-s-2 border-sage-200 ps-4">
              <p className="text-ink">
                {t(`alsoWorthChecking.${item.id}.name`)}{" "}
                <span className="text-ink-muted" lang="en">
                  · {item.where}
                </span>
              </p>
              <p className="mt-1 text-ink-soft">{t(`alsoWorthChecking.${item.id}.why`)}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );

  function ReportNote({ status }: { status: Status }) {
    if (status === "idle" || status === "saving") return null;

    const message =
      status === "supabase"
        ? t("addedSupabase")
        : status === "device"
          ? t("addedDevice")
          : t("addedDemo");

    return (
      <p className="text-sm text-sage-800" role="status">
        <span aria-hidden="true">✓ </span>
        {message}
      </p>
    );
  }
}
