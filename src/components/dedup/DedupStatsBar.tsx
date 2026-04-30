// DedupStatsBar.tsx
//
// Horizontal stats bar displayed at the top of AutoDeduplicateView during a run.
// Shows four counters (scanned, duplicates, actioned, errors) plus a live stage
// indicator and a Pause/Resume button.
//
// The pause button is intentionally hidden during a dry-run scan (dryRun &&
// phase === "running") because the user cannot meaningfully interact with a preview
// scan mid-flight — they confirm or cancel after it finishes.

"use client";

import type { Stats, Phase } from "./dedup-types";

// Filter key passed when a stat item is clicked. null means "reset filter / show all".
export type StatFilterKey = "all" | "pending" | "kept" | "actioned" | "errors" | "skipped";

interface DedupStatsBarProps {
  stats: Stats;
  verb: string;
  phase: Phase;
  activeStage: string;
  dryRun: boolean;
  onPause: () => void;
  /** Called when the user clicks a stat item to filter the results table. */
  onStatClick: (key: StatFilterKey) => void;
}

export function DedupStatsBar({ stats, verb, phase, activeStage, dryRun, onPause, onStatClick }: DedupStatsBarProps) {
  return (
    <div className="auto-dedup-stats">
      <button className="auto-dedup-stat" onClick={() => onStatClick("all")} type="button">
        <span className="auto-stat-value">{stats.scanned}</span>
        <span className="auto-stat-label">scanned</span>
      </button>
      <button className="auto-dedup-stat" onClick={() => onStatClick("pending")} type="button">
        <span className="auto-stat-value">{stats.duplicatesFound}</span>
        <span className="auto-stat-label">to remove</span>
      </button>
      <button className="auto-dedup-stat" onClick={() => onStatClick("actioned")} type="button">
        <span className={`auto-stat-value ${stats.actioned > 0 ? "val-success" : ""}`}>
          {stats.actioned}
        </span>
        <span className="auto-stat-label">{verb}</span>
      </button>
      <button className="auto-dedup-stat" onClick={() => onStatClick("skipped")} type="button">
        <span className="auto-stat-value">–</span>
        <span className="auto-stat-label">skipped</span>
      </button>
      <button className="auto-dedup-stat" onClick={() => onStatClick("errors")} type="button">
        <span className={`auto-stat-value ${stats.errors > 0 ? "val-error" : ""}`}>
          {stats.errors}
        </span>
        <span className="auto-stat-label">errors</span>
      </button>

      {(phase === "running" || phase === "paused") && (
        <div className="auto-spinner-group">
          {phase === "running" && <div className="auto-spinner" />}
          {activeStage && (
            <span className="auto-stage-label">
              {activeStage === "fetch" && "Fetching"}
              {activeStage === "match" && "Scanning"}
              {activeStage === "delete" && "Deleting"}
              {activeStage === "preview" && "Previewing"}
            </span>
          )}
          {!(dryRun && phase === "running") && (
            <button onClick={onPause} className="auto-pause-btn">
              {phase === "paused" ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
