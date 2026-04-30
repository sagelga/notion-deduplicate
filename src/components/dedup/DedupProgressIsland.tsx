// DedupProgressIsland.tsx
// Collapsed "island" state showing a compact progress pill.

import type { Mode, Phase, Stats } from "./dedup-types";

interface DedupProgressIslandProps {
  phase: Phase;
  mode: Mode;
  stats: Stats;
  onClick: () => void;
}

export function DedupProgressIsland({
  phase,
  mode,
  stats,
  onClick,
}: DedupProgressIslandProps) {
  const verb = mode === "archive" ? "archived" : "deleted";

  return (
    <button
      className="dedup-island"
      onClick={onClick}
      aria-label="Expand deduplication progress"
      title="Click to expand"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        className={phase === "running" && stats.duplicatesFound === 0 ? "dedup-ring-indeterminate" : undefined}
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="13"
          fill="none"
          stroke={phase === "error" ? "rgba(235,87,87,0.2)" : "var(--color-rim)"}
          strokeWidth="2.5"
        />
        <circle
          cx="16"
          cy="16"
          r="13"
          fill="none"
          stroke={phase === "error" ? "#eb5757" : "var(--color-accent)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 13}
          strokeDashoffset={
            phase === "error"
              ? 0
              : phase === "done"
              ? 0
              : stats.duplicatesFound > 0
              ? (2 * Math.PI * 13) * (1 - Math.min((stats.actioned / stats.duplicatesFound) * 100, 100) / 100)
              : (2 * Math.PI * 13) * 0.72
          }
          transform="rotate(-90 16 16)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="dedup-island-text">
        <span className="dedup-island-main">
          {phase === "running" && stats.actioned === 0
            ? `${stats.scanned} scanned · ${stats.duplicatesFound} found`
            : `${stats.scanned} scanned · ${stats.actioned} ${verb}`}
        </span>
        {stats.errors > 0 && (
          <span className="dedup-island-errors">
            {stats.errors} error{stats.errors !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <svg
        className="dedup-island-chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}