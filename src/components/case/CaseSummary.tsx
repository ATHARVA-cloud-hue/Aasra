"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { DEMO_CASE, DEMO_CLAIMS, TONE_CLASSES } from "@/lib/demo";
import type { AssetRow, CaseRecord } from "@/lib/caseStore";

/*
  YOUR CASE — what the family actually told us, read back to them.

  The one rule this screen must never break: a real family sees their
  own details, and only a demo sees the sample family. The check is
  made once, in decideView() below, and everything else follows from it.
*/

type View =
  | { kind: "loading" }
  | { kind: "demo" }
  | { kind: "real"; record: CaseRecord; assets: AssetRow[] }
  | { kind: "empty" };

export function CaseSummary() {
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Loaded only now, so this page opens without waiting for the
      // database library — and still works if that library fails.
      const { getMode, hasRealAnswers, loadAssets, loadCase } = await import("@/lib/caseStore");

      if (getMode() === "demo") {
        if (!cancelled) setView({ kind: "demo" });
        return;
      }

      const { record } = await loadCase();
      if (cancelled) return;

      if (!hasRealAnswers(record)) {
        setView({ kind: "empty" });
        return;
      }

      // The case itself is the important part; assets are a bonus, and
      // loadAssets() returns an empty list rather than failing.
      const assets = await loadAssets();
      if (!cancelled) setView({ kind: "real", record, assets });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (view.kind === "loading") {
    return (
      <Card>
        <p className="text-ink-soft" role="status">
          Gathering everything you have shared…
        </p>
      </Card>
    );
  }

  if (view.kind === "demo") return <DemoCase />;
  if (view.kind === "empty") return <NothingYet />;

  return <RealCase record={view.record} assets={view.assets} />;
}

/* ---------------------------------------------------------------- */

function RealCase({ record, assets }: { record: CaseRecord; assets: AssetRow[] }) {
  const children = splitLines(record.children_names);
  const family = [
    ...(record.spouse_name ? [{ name: record.spouse_name, relation: "Spouse" }] : []),
    ...children.map((name) => ({ name, relation: "Child" })),
  ];

  return (
    <>
      <Card>
        <h2 className="text-xl">The person we are helping you with</h2>
        <dl className="mt-5 divide-y divide-line">
          <Row label="Their name" value={record.deceased_name} />
          <Row label="They were your" value={record.relationship} />
          <Row label="Date of death" value={formatDate(record.date_of_death)} />
          <Row label="Town or city" value={record.place_of_death} />
        </dl>
      </Card>

      {family.length > 0 && (
        <Card className="mt-5">
          <h2 className="text-xl">Their immediate family</h2>
          <ul className="mt-5 divide-y divide-line">
            {family.map((person) => (
              <li key={`${person.relation}-${person.name}`} className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-ink">{person.name}</span>
                <span className="text-sm text-ink-muted">{person.relation}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {record.known_assets_note && (
        <Card className="mt-5">
          <h2 className="text-xl">What you told us about</h2>
          <p className="mt-3 whitespace-pre-line text-ink-soft">{record.known_assets_note}</p>
        </Card>
      )}

      {assets.length > 0 && (
        <Card className="mt-5">
          <h2 className="text-xl">What is being tracked</h2>
          <ul className="mt-5 divide-y divide-line">
            {assets.map((asset) => (
              <li key={asset.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
                <span>
                  <span className="text-ink">{asset.asset_type || "An asset"}</span>
                  {(asset.institution || asset.details) && (
                    <span className="block text-sm text-ink-muted">
                      {[asset.institution, asset.details].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className={`rounded-full px-3 py-1 text-sm ${TONE_CLASSES.waiting}`}>
                  {asset.source === "discovered" ? "We found this" : "You told us"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

/* The sample family — only ever reached in demo mode. */
function DemoCase() {
  return (
    <>
      <div className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">
        You are walking through the journey as a sample family. Everything below is fictional.
      </div>

      <Card className="mt-5">
        <h2 className="text-xl">The person we are helping you with</h2>
        <dl className="mt-5 divide-y divide-line">
          <Row label="Their name" value={DEMO_CASE.deceased_name} />
          <Row label="They were your" value={DEMO_CASE.relationship} />
          <Row label="Date of death" value={formatDate(DEMO_CASE.date_of_death)} />
          <Row label="Town or city" value={DEMO_CASE.place_of_death} />
        </dl>
      </Card>

      <Card className="mt-5">
        <h2 className="text-xl">What is happening now</h2>
        <ul className="mt-5 divide-y divide-line">
          {DEMO_CLAIMS.map((claim) => (
            <li key={claim.what} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
              <span>
                <span className="text-ink">{claim.what}</span>
                <span className="block text-sm text-ink-muted">{claim.where}</span>
              </span>
              <span className={`rounded-full px-3 py-1 text-sm ${TONE_CLASSES[claim.tone]}`}>{claim.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* A real visitor who has not answered anything yet. No sample data. */
function NothingYet() {
  return (
    <Card>
      <h2 className="text-xl">Nothing here yet</h2>
      <p className="mt-3 text-ink-soft">
        Once you have answered a few of the questions, this page fills itself in — the person you are claiming for,
        their family, and where each claim stands.
      </p>
      <p className="mt-3 text-ink-soft">
        There is no rush. Answer one question, close the tab, and come back whenever you are ready.
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------------- */

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

/** "Arjun Nair\nMeera Nair" → ["Arjun Nair", "Meera Nair"] */
function splitLines(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "2024-03-02" → "2 March 2024". Left alone if it is not a plain date. */
function formatDate(value?: string | null): string {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
