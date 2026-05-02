// DedupActionBar.tsx
// Archive/delete mode toggle + warning + action button

"use client";

import type { Mode } from "./dedup-types";

interface DedupActionBarProps {
  pageIdsToAction: number;
  mode: Mode;
  acting: boolean;
  onModeChange: (m: Mode) => void;
  onAction: () => void;
}

export function DedupActionBar({
  pageIdsToAction,
  mode,
  acting,
  onModeChange,
  onAction,
}: DedupActionBarProps) {
  const actionLabel = acting
    ? mode === "archive" ? "Archiving…" : "Deleting…"
    : mode === "archive"
    ? `Archive ${pageIdsToAction} duplicates`
    : `Delete ${pageIdsToAction} duplicates`;

  return (
    <div className="dedup-actions">
      <div className="dedup-mode-toggle">
        <label className={`dedup-mode-option ${mode === "archive" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="archive"
            checked={mode === "archive"}
            onChange={() => onModeChange("archive")}
          />
          Archive <span className="dedup-mode-hint">(safer, recoverable)</span>
        </label>
        <label className={`dedup-mode-option ${mode === "delete" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            value="delete"
            checked={mode === "delete"}
            onChange={() => onModeChange("delete")}
          />
          Permanently delete <span className="dedup-mode-hint">(cannot be undone)</span>
        </label>
      </div>
      {mode === "delete" && (
        <p className="dedup-delete-warning">
          Archive moves pages to Notion&rsquo;s trash — restorable for 30&nbsp;days.
          Delete permanently removes them with no recovery.{" "}
          <a
            href="https://www.notion.com/help/archive-or-delete-content"
            target="_blank"
            rel="noopener noreferrer"
            className="dedup-delete-warning-link"
          >
            Learn more
          </a>
        </p>
      )}
      <button
        onClick={onAction}
        disabled={acting || pageIdsToAction === 0}
        className={`dedup-action-btn ${mode === "delete" ? "dedup-action-btn--danger" : ""}`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
