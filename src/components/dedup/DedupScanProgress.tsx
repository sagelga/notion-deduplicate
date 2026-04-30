// DedupScanProgress.tsx
//
// Inline scan progress banner shown during the dry-run phase while
// AutoDeduplicateView is fetching and matching pages. It replaces the results
// table until the scan completes and results are revealed atomically.
// The progress bar is an indeterminate CSS animation (no known total page count
// until the entire database is fetched).

"use client";

import type { Stats } from "./dedup-types";

interface DedupScanProgressProps {
  stats: Stats;
}

export function DedupScanProgress({ stats }: DedupScanProgressProps) {
  return (
    <div className="auto-scan-progress">
      <div className="auto-scan-spinner" />
      <div className="auto-scan-content">
        <p className="auto-scan-title">Scanning for duplicates…</p>
        <p className="auto-scan-sub">
          {stats.scanned > 0
            ? `${stats.scanned} pages scanned · ${stats.duplicatesFound} duplicate${stats.duplicatesFound !== 1 ? "s" : ""} found so far`
            : "Fetching pages from Notion…"}
        </p>
        <div className="auto-scan-bar-track">
          <div className="auto-scan-bar-fill" />
        </div>
      </div>
    </div>
  );
}
