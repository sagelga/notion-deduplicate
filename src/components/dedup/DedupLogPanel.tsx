// DedupLogPanel.tsx
//
// Always-visible log panel shown at the bottom of AutoDeduplicateView.
// Displays a filtered, newest-first slice of stream events for the user.
// Key behaviours owned by the parent (AutoDeduplicateView), not this component:
//   - Auto-scroll to top (newest entry) while the user hasn't scrolled away.
//   - Filtering out high-frequency events (progress, actioned, kept/skipped pages).
//   - Export: the "Export JSON" button triggers the parent's handleExport which
//     serialises the full unfiltered logsRef into a downloadable JSON file.
// The displayed count shows total raw events (from logsRef.current.length) rather
// than the filtered displayLogs length so the user knows how much data the export
// will contain.
//
// Timestamp format:
//   - The session start entry (type === "start") shows an absolute wall-clock time
//     as "HH:MM:SS" so the user knows when the run began.
//   - All subsequent entries show delta time as "+MM:SS.cc" relative to session start.

"use client";

import type { RefObject } from "react";
import type { LogEntry } from "./dedup-types";
import Button from "@/components/ui/Button";

// Formats a relative timestamp (ms since session start) as "+MM:SS.cc"
function fmtTs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

// Formats an absolute Unix timestamp (ms) as "HH:MM:SS" in local time
function fmtAbsTs(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

interface DedupLogPanelProps {
  displayLogs: LogEntry[];
  totalLogCount: number;
  onExport: () => void;
  logScrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

export function DedupLogPanel({
  displayLogs,
  totalLogCount,
  onExport,
  logScrollRef,
  onScroll,
}: DedupLogPanelProps) {
  return (
    <div className="auto-log-section">
      <div className="auto-log-header">
        <span className="auto-log-title">
          Logs
          {totalLogCount > 0 && (
            <span className="auto-log-count">{totalLogCount} events</span>
          )}
        </span>
        {totalLogCount > 0 && (
          <Button variant="secondary" onClick={onExport}>
            Export JSON
          </Button>
        )}
      </div>

      <div
        className="auto-log-panel"
        ref={logScrollRef}
        onScroll={onScroll}
      >
        {displayLogs.length === 0 ? (
          <div className="auto-log-empty">No events yet.</div>
        ) : (
          displayLogs.map((entry, i) => (
            <div key={i} className={`auto-log-line auto-log-line--${entry.level}`}>
              <span className="auto-log-ts">
                {entry.type === "start" ? fmtAbsTs(entry.absTs) : fmtTs(entry.ts)}
              </span>
              <span className="auto-log-msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
