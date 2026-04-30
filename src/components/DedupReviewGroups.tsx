// DedupReviewGroups.tsx
//
// S4 Review view: shown when dryRun scan completes (phase === "preview").
// Groups pending/kept rows by fieldValue and lets the user navigate group by
// group with keep (left, green) / delete (right, red) split cards.
// "Delete all" calls onConfirm() to trigger the real run.

"use client";

import { useMemo, useState } from "react";
import type { PageRow, Stats, Mode } from "./dedup-types";
import "./DedupReviewGroups.css";

interface Group {
  fieldValue: string;
  keepRow: PageRow;
  deleteRows: PageRow[];
}

function buildGroups(rows: PageRow[]): Group[] {
  const map = new Map<string, { keeps: PageRow[]; deletes: PageRow[] }>();
  for (const row of rows) {
    const key = row.fieldValue ?? "(empty)";
    if (!map.has(key)) map.set(key, { keeps: [], deletes: [] });
    const entry = map.get(key)!;
    if (row.status === "kept") entry.keeps.push(row);
    else if (row.status === "pending") entry.deletes.push(row);
  }
  const groups: Group[] = [];
  for (const [fieldValue, { keeps, deletes }] of map.entries()) {
    if (deletes.length === 0) continue;
    groups.push({
      fieldValue,
      keepRow: keeps[0] ?? deletes[0],
      deleteRows: keeps.length > 0 ? deletes : deletes.slice(1),
    });
  }
  return groups;
}

interface DedupReviewGroupsProps {
  rows: PageRow[];
  stats: Stats;
  mode: Mode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function DedupReviewGroups({ rows, stats, mode, onConfirm, onCancel }: DedupReviewGroupsProps) {
  const groups = useMemo(() => buildGroups(rows), [rows]);
  const [gIdx, setGIdx] = useState(0);

  if (groups.length === 0) {
    return (
      <div className="drg-empty">
        <div className="drg-empty-icon">∅</div>
        <h2 className="drg-empty-title">No duplicates found</h2>
        <p className="drg-empty-sub">
          Scanned {stats.scanned} pages — all values are unique.
        </p>
        <button className="drg-btn drg-btn--ghost" onClick={onCancel}>
          ← Back to configure
        </button>
      </div>
    );
  }

  const group = groups[Math.min(gIdx, groups.length - 1)];
  const totalToDelete = groups.reduce((s, g) => s + g.deleteRows.length, 0);
  const isLast = gIdx >= groups.length - 1;

  return (
    <div className="drg-wrapper">
      {/* Header */}
      <div className="drg-header">
        <h1 className="drg-title">Review duplicates</h1>
        <span className="drg-tag drg-tag--orange">
          {groups.length} groups · {totalToDelete} to {mode === "archive" ? "archive" : "delete"}
        </span>
        <span className="drg-keep-hint">keep = newest</span>
      </div>

      {/* Group nav */}
      <div className="drg-nav">
        <button className="drg-btn drg-btn--sm" disabled={gIdx === 0} onClick={() => setGIdx(g => g - 1)}>
          ‹ Prev
        </button>
        <div className="drg-dots">
          {groups.map((_, i) => (
            <div
              key={i}
              className={`drg-dot${i === gIdx ? " drg-dot--active" : ""}`}
              onClick={() => setGIdx(i)}
            />
          ))}
        </div>
        <span className="drg-nav-count">{gIdx + 1}/{groups.length}</span>
        <button className="drg-btn drg-btn--sm" disabled={isLast} onClick={() => setGIdx(g => g + 1)}>
          Next ›
        </button>
      </div>

      {/* Group field value label */}
      <div className="drg-group-label">
        <span className="drg-field-value">{group.fieldValue || "(empty)"}</span>
        <span className="drg-tag drg-tag--gray">{group.deleteRows.length + 1} pages</span>
      </div>

      {/* Keep / Delete split */}
      <div className="drg-split">
        {/* KEEP card */}
        <div className="drg-col">
          <div className="drg-col-label drg-col-label--keep">Keep · newest</div>
          <div className="drg-card drg-card--keep">
            <div className="drg-card-title">{group.keepRow.title || "(Untitled)"}</div>
            <div className="drg-card-field">{group.keepRow.fieldValue}</div>
          </div>
        </div>

        {/* DELETE cards */}
        <div className="drg-col">
          <div className="drg-col-label drg-col-label--delete">
            {mode === "archive" ? "Archive" : "Delete"} · {group.deleteRows.length} older{" "}
            {group.deleteRows.length === 1 ? "copy" : "copies"}
          </div>
          <div className="drg-delete-list">
            {group.deleteRows.map((row, i) => (
              <div key={i} className="drg-card drg-card--delete">
                <div className="drg-card-title">{row.title || "(Untitled)"}</div>
                <div className="drg-card-field">{row.fieldValue}</div>
                <div className="drg-delete-x">×</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="drg-actions">
        <button
          className="drg-btn drg-btn--danger"
          onClick={onConfirm}
        >
          {mode === "archive" ? "Archive" : "Delete"} {totalToDelete} duplicate{totalToDelete !== 1 ? "s" : ""}
        </button>
        <button
          className="drg-btn"
          onClick={() => { if (!isLast) setGIdx(g => g + 1); else onConfirm?.(); }}
        >
          {isLast ? "Done reviewing →" : "Next group →"}
        </button>
        <span className="drg-kbd-hint">
          <kbd className="drg-kbd">←→</kbd> navigate
        </span>
        <button className="drg-btn drg-btn--ghost drg-btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
