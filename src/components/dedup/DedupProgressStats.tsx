// DedupProgressStats.tsx
// Displays the hero metric, sub-line, elapsed time, and error state.

import { useState, useEffect } from "react";
import type { Mode, Phase, Stats } from "./dedup-types";

interface DedupProgressStatsProps {
  phase: Phase;
  mode: Mode;
  stats: Stats;
  errorMessage?: string | null;
}

function useElapsedTime(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function DedupProgressStats({ phase, mode, stats, errorMessage }: DedupProgressStatsProps) {
  const elapsed = useElapsedTime(phase === "running");
  const verb = mode === "archive" ? "archived" : "deleted";

  const heroNumber = stats.duplicatesFound > 0 ? stats.actioned : stats.scanned;
  const heroLabel = stats.duplicatesFound > 0 ? verb : "scanned";

  return (
    <>
      <div className="dedup-hero">
        <span className="dedup-hero-number">{heroNumber}</span>
        <span className="dedup-hero-verb">{heroLabel}</span>
      </div>

      <p className="dedup-sub-line">
        {stats.duplicatesFound > 0 ? (
          <>
            of {stats.duplicatesFound} duplicate{stats.duplicatesFound !== 1 ? "s" : ""}
            {stats.scanned > 0 && <> &middot; {stats.scanned} scanned</>}
            {stats.errors > 0 && (
              <> &middot; <span className="dedup-sub-error">
                {stats.errors} error{stats.errors !== 1 ? "s" : ""}
              </span></>
            )}
          </>
        ) : phase === "running" ? (
          "Scanning for duplicates…"
        ) : (
          "No duplicates found"
        )}
      </p>

      {phase === "running" && elapsed > 0 && (
        <p className="dedup-elapsed">{fmtElapsed(elapsed)} elapsed</p>
      )}

      {phase === "error" && errorMessage && (
        <p className="dedup-sheet-error">{errorMessage}</p>
      )}
    </>
  );
}