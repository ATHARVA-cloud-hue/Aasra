"use client";

import { useEffect, useState } from "react";
import type { ServiceStatus } from "@/lib/env";

/*
  THE STRIP ALONG THE TOP.

  It answers one question honestly: is what I am looking at real?

  There are two separate things that could make it not real, and they
  used to be muddled together under the one word "demo":

  1. The visitor chose "Continue as a demo family" — so the names on
     screen are a fictional family's. This is what getMode() knows.

  2. Supabase keys are missing — so answers are kept on this device
     instead of a database. This is what /api/status knows.

  They are not the same thing, and the old wording said "using
  fictional sample families" for case 2, which became untrue the moment
  the pages started reading real answers: a real family without a
  database sees their own details, kept locally. Being told those were
  fictional would be alarming and wrong.

  If a check fails, the strip shows nothing. It is an aside, never a
  blocker.
*/

type Mode = "demo" | "real" | "unknown";

export function DemoModeBanner() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [mode, setMode] = useState<Mode>("unknown");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ServiceStatus | null) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        /* Stay quiet — the strip is optional. */
      });

    void (async () => {
      try {
        const { getMode } = await import("@/lib/caseStore");
        if (!cancelled) setMode(getMode());
      } catch {
        /* Leave it as unknown. */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    Said in order of how much it matters to the person reading it.
    Being shown a stranger's family is the most important thing to
    know, so it wins over everything else.
  */
  const message = (() => {
    if (mode === "demo") {
      return "You are exploring as a sample family. These are not real people, and nothing you enter is saved.";
    }
    if (status?.demoMode) {
      return "Your answers are kept on this device only — the database is not connected yet.";
    }
    if (status && !status.ai) {
      return "AI key not set — document reading and the assistant use pre-written sample answers.";
    }
    return null;
  })();

  if (!message) return null;

  // Clay for the sample-family warning, sage for the quieter notes.
  const tone = mode === "demo" ? "bg-clay-50 text-clay-700" : "bg-sage-50 text-sage-800";

  return (
    <div className={`animate-fade-in py-2 text-center text-sm ${tone}`} role="status">
      {message}
    </div>
  );
}
