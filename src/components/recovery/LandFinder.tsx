"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ALL_STATES,
  CENTRAL_LAND_PROGRAMME,
  LAND_PORTALS,
  portalForState,
  suggestPortal,
  STATES_WITHOUT_CONFIRMED_PORTAL,
  type LandPortal,
} from "@/lib/landRecords";

/*
  PROPERTY AND LAND.

  No rupee figure appears anywhere on this card, deliberately. A
  plot's value depends on its exact location, its road access, its
  title and whether it is agricultural, and none of that can be
  inferred from a state name. Putting a number on it would be the
  least defensible thing in the whole feature.

  What this does instead is the part that actually helps: it works out
  which state's land record portal applies, links to the official one,
  says what to search by, and takes down whatever the family finds.

  Every link here was opened and checked. A state whose official
  address could not be confirmed is named without a link rather than
  guessed at, because the people searching for a dead parent's land
  are exactly who a convincing fake portal is built for.
*/

type Status = "idle" | "saving" | "supabase" | "device" | "demo";

export function LandFinder() {
  const t = useTranslations("landRecords");

  const [chosen, setChosen] = useState<string>("");
  const [suggested, setSuggested] = useState<{
    portal?: LandPortal;
    state?: string;
    guessedFromPlace: boolean;
  }>({ guessedFromPlace: false });

  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // Work out which state to show first, from the saved case.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { getMode, loadCase } = await import("@/lib/caseStore");

      if (getMode() === "demo") {
        const { DEMO_CASE } = await import("@/lib/demo");
        if (!cancelled) {
          setChosen("Maharashtra");
          setSuggested(suggestPortal("Maharashtra", DEMO_CASE.place_of_death));
        }
        return;
      }

      const { record } = await loadCase();
      if (cancelled) return;

      const result = suggestPortal(record.property_state, record.place_of_death);
      setSuggested(result);
      // Preselect whatever was worked out, so the dropdown agrees
      // with the portal shown above it.
      if (result.state) setChosen(result.state);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    The portal to show. A state picked here and now wins over
    whatever was worked out from the saved case, so changing the
    dropdown changes the card immediately.
  */
  const active = chosen ? portalForState(chosen) : suggested.portal;
  const activeState = chosen || suggested.state;
  const unconfirmed = Boolean(activeState && !active);

  async function record() {
    const text = note.trim();
    if (!text) return;

    setStatus("saving");

    const { addAssets, getMode } = await import("@/lib/caseStore");

    /*
      Demo mode writes nothing, the same rule the registry list
      follows. A made-up plot of land appearing in a real family's
      inheritance claim is not a mess worth risking.
    */
    if (getMode() === "demo") {
      setStatus("demo");
      setNote("");
      return;
    }

    const outcome = await addAssets([
      {
        // English in the database on purpose: this value is stored and
        // read back, so translating it would split one plot into two
        // kinds of asset depending on the language it was entered in.
        asset_type: "Property/Land",
        institution: active ? active.portalName : (activeState ?? null),
        details: text,
        source: "discovered",
      },
    ]);

    setStatus(outcome.where === "supabase" ? "supabase" : "device");
    setNote("");
  }

  return (
    <Card>
      <h2 className="text-xl">{t("title")}</h2>
      <p className="mt-2 text-ink-soft">{t("body")}</p>

      {/* The same warning the hidden-asset searches carry. */}
      <p className="mt-4 rounded-2xl bg-sage-50 px-4 py-3 text-sage-800">{t("safety")}</p>

      {/* ---------- Pick a state ---------- */}
      <div className="mt-6">
        <label htmlFor="land-state" className="text-base font-medium text-ink">
          {t("stateLabel")}
        </label>
        <p className="mt-1 text-sm text-ink-muted">{t("stateHelp")}</p>
        <select
          id="land-state"
          value={chosen}
          onChange={(event) => setChosen(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink focus:border-sage-400"
        >
          <option value="">{t("statePick")}</option>
          {ALL_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>

      {/* ---------- The matching portal ---------- */}
      {active && (
        <div className="mt-6 rounded-2xl border border-sage-200 bg-paper px-4 py-4">
          {suggested.guessedFromPlace && !chosen && (
            <p className="text-sm text-ink-muted">{t("guessedFromPlace")}</p>
          )}

          <p className="mt-1 text-ink">
            {/* Both are proper nouns, so neither is translated. */}
            <span lang="en">{active.state}</span>
            <span className="text-ink-muted"> · </span>
            <span lang="en">{active.portalName}</span>
          </p>

          <p className="mt-2 text-sm text-ink-soft">{t(`portals.${active.id}`)}</p>

          <Button
            href={active.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full sm:w-auto"
          >
            {t("openPortal")}
          </Button>

          {/* Shown in full so it can be checked before clicking. */}
          <p className="mt-3 break-all text-sm text-ink-muted">
            {t("opensInNewTab", { url: active.url ?? "" })}
          </p>
        </div>
      )}

      {/*
        A state the family named that has no confirmed address yet.
        Said plainly, with the central programme as the way onward.
      */}
      {unconfirmed && (
        <div className="mt-6 rounded-2xl bg-clay-50 px-4 py-4">
          <p className="text-clay-700">{t("noPortalTitle", { state: activeState ?? "" })}</p>
          <p className="mt-2 text-sm text-clay-700">{t("noPortalBody")}</p>
          <Button
            href={CENTRAL_LAND_PROGRAMME.url}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full sm:w-auto"
          >
            {t("openCentral")}
          </Button>
        </div>
      )}

      {/* ---------- Record what was found ---------- */}
      <div className="mt-7 border-t border-line pt-6">
        <label htmlFor="land-found" className="text-base font-medium text-ink">
          {t("foundLabel")}
        </label>
        <p className="mt-1 text-sm text-ink-muted">{t("foundHelp")}</p>

        <textarea
          id="land-found"
          rows={3}
          value={note}
          placeholder={t("foundPlaceholder")}
          disabled={status === "saving"}
          onChange={(event) => setNote(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-muted focus:border-sage-400 disabled:opacity-60"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="secondary"
            disabled={!note.trim() || status === "saving"}
            onClick={() => void record()}
            className="w-full sm:w-auto"
          >
            {status === "saving" ? t("adding") : t("addToCase")}
          </Button>

          {(status === "supabase" || status === "device" || status === "demo") && (
            <p className="text-sm text-sage-800" role="status">
              <span aria-hidden="true">✓ </span>
              {status === "supabase"
                ? t("addedSupabase")
                : status === "device"
                  ? t("addedDevice")
                  : t("addedDemo")}
            </p>
          )}
        </div>
      </div>

      {/* ---------- Every confirmed portal, and what is missing ---------- */}
      <details className="mt-7 border-t border-line pt-6">
        <summary className="cursor-pointer text-base text-sage-800">{t("allStatesTitle")}</summary>

        <ul className="mt-4 space-y-3">
          {LAND_PORTALS.map((portal) => (
            <li key={portal.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-ink" lang="en">
                {portal.state}
              </span>
              <a
                href={portal.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sage-700 underline underline-offset-4"
                lang="en"
              >
                {portal.portalName}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm text-ink-muted">{t("notYetConfirmed")}</p>
        <p className="mt-2 text-sm text-ink-soft" lang="en">
          {STATES_WITHOUT_CONFIRMED_PORTAL.join(", ")}
        </p>
      </details>
    </Card>
  );
}
