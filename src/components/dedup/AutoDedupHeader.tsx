// AutoDedupHeader.tsx
// Heading with title, page count, and status tag

"use client";

import type { Phase } from "./dedup-types";

interface AutoDedupHeaderProps {
  phase: Phase;
  stats: { scanned: number; duplicatesFound: number };
  databaseName: string;
  dupGroupCount: number;
}

export function AutoDedupHeader({ phase, stats, databaseName, dupGroupCount }: AutoDedupHeaderProps) {
  const isRunning = phase === "running";
  const isPaused = phase === "paused";

  return (
    <div className="auto-scan-heading">
      <h1 className="auto-scan-title-lg">
        {isRunning ? "Scanning…" : isPaused ? "Paused" : "Scan complete"}
      </h1>
      {isRunning && (
        <span className="auto-scan-page-count">
          {stats.scanned} pages scanned · {databaseName}
        </span>
      )}
      {!isRunning && !isPaused && phase !== "error" && (
        <span className="auto-scan-complete-tag">
          {dupGroupCount} groups found
        </span>
      )}
    </div>
  );
}
