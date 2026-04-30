// DedupPreviewConfirm.tsx
//
// Confirmation panel shown after a dry-run scan completes (phase === "preview").
// Summarises what will be actioned and provides a single confirm button to
// trigger the real run. If no duplicates were found, it shows a "no action
// needed" message with a link back instead of a confirm button.
// The confirm button has a danger variant for the "delete" mode to visually
// distinguish permanent deletion from the recoverable archive action.

"use client";

import type { Stats, Mode } from "./dedup-types";

interface DedupPreviewConfirmProps {
  stats: Stats;
  mode: Mode;
  onConfirm?: () => void;
}

export function DedupPreviewConfirm({ stats, mode, onConfirm }: DedupPreviewConfirmProps) {
  return (
    <div className="auto-dedup-preview">
      <p className="auto-preview-summary">
        Scan complete — found <strong>{stats.duplicatesFound}</strong> duplicate
        {stats.duplicatesFound !== 1 ? "s" : ""} across <strong>{stats.scanned}</strong> pages.
        {stats.duplicatesFound > 0
          ? ` ${stats.duplicatesFound} page${stats.duplicatesFound !== 1 ? "s" : ""} will be ${mode === "archive" ? "archived" : "permanently deleted"}.`
          : " No action needed."}
      </p>
      {stats.duplicatesFound > 0 && (
        <button
          className={`auto-confirm-btn${mode === "delete" ? " auto-confirm-btn--danger" : ""}`}
          onClick={onConfirm}
        >
          Confirm &amp; {mode === "archive" ? "Archive" : "Delete"} {stats.duplicatesFound} page
          {stats.duplicatesFound !== 1 ? "s" : ""}
        </button>
      )}
      {stats.duplicatesFound === 0 && (
        <a href="/duplicate" className="auto-dedup-back">Back to Duplicate</a>
      )}
    </div>
  );
}
