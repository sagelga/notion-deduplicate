// DedupProgressBottomSheet.tsx
//
// Persistent floating progress indicator shown in the footer during and after a
// deduplication run. It has two visual states:
//   - Collapsed ("island"): a compact pill with a ring-progress SVG and a one-line
//     summary. Clicking expands it.
//   - Expanded ("sheet"): an overlay panel with full stats, metadata, elapsed time,
//     and action buttons (pause/resume, view progress, dismiss).
//
// The component reads shared run state from DedupProvider (useDedup) and is only
// rendered when a run is active (isActive === true). It's mounted once in Footer
// so it persists across page navigations without losing state.
//
// The "View progress" link is hidden when the user is already on the /duplicate page
// to avoid showing a no-op navigation button.

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDedup } from "@/hooks/useDedup";
import { Button } from "./ui";
import "./DedupProgressBottomSheet.css";

interface RingProps {
  actioned: number;
  duplicatesFound: number;
  phase: string;
}

// SVG ring that shows dedup completion as a circular progress arc.
// While scanning (duplicatesFound still 0), it renders in indeterminate/spin mode
// via a CSS animation class rather than trying to show meaningless 0% progress.
function RingProgress({ actioned, duplicatesFound, phase }: RingProps) {
  const r = 13;
  const circ = 2 * Math.PI * r;

  // Switch to indeterminate spinning animation while we don't yet know the total
  const indeterminate = phase === "running" && duplicatesFound === 0;

  const pct =
    phase === "done"
      ? 100
      : duplicatesFound > 0
      ? Math.min((actioned / duplicatesFound) * 100, 100)
      : 0;

  const trackColor =
    phase === "error" ? "rgba(235,87,87,0.2)" : "var(--color-rim)";
  const arcColor =
    phase === "error"
      ? "#eb5757"
      : phase === "done"
      ? "var(--color-accent)"
      : "var(--color-accent)";

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className={indeterminate ? "dedup-ring-indeterminate" : undefined}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r={r} fill="none" stroke={trackColor} strokeWidth="2.5" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={arcColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={indeterminate ? circ * 0.72 : circ * (1 - pct / 100)}
        transform="rotate(-90 16 16)"
        style={indeterminate ? undefined : { transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
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

export default function DedupProgressBottomSheet() {
  const pathname = usePathname();
  const {
    isActive, phase, mode, databaseName, fieldName,
    stats, errorMessage, pausedRef, setPhase, dismissDedup,
  } = useDedup();
  const [expanded, setExpanded] = useState(false);
  const elapsed = useElapsedTime(phase === "running");

  if (!isActive) return null;

  const verb = mode === "archive" ? "archived" : "deleted";
  const isOnDedupPage = pathname === "/duplicate" || (pathname?.startsWith("/duplicate/") ?? false);

  // ── Collapsed island ─────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        className="dedup-island"
        onClick={() => setExpanded(true)}
        aria-label="Expand deduplication progress"
        title="Click to expand"
      >
        <RingProgress
          actioned={stats.actioned}
          duplicatesFound={stats.duplicatesFound}
          phase={phase}
        />
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

  // ── Expanded sheet ────────────────────────────────────────────
  const phaseLabel =
    phase === "running" ? "Running"
    : phase === "paused" ? "Paused"
    : phase === "done"   ? "Done"
    : phase === "preview" ? "Preview"
    : "Error";

  // Pick the most meaningful number to display prominently:
  // - Once duplicates are found, show how many have been actioned (the key progress metric).
  // - Before any duplicates are found, show pages scanned (the only meaningful number).
  const heroNumber = stats.duplicatesFound > 0 ? stats.actioned : stats.scanned;
  const heroLabel  = stats.duplicatesFound > 0 ? verb : "scanned";

  return (
    <div className="dedup-sheet-overlay" onClick={() => setExpanded(false)}>
      <div className="dedup-sheet" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="dedup-sheet-header">
          <div className="dedup-sheet-header-left">
            <span className="dedup-sheet-title">Deduplication</span>
            <span className={`dedup-phase-badge dedup-phase--${phase}`}>
              {phaseLabel}
            </span>
          </div>
          <button
            className="dedup-sheet-close"
            onClick={() => setExpanded(false)}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="dedup-sheet-body">

          {/* Hero metric */}
          <div className="dedup-hero">
            <span className="dedup-hero-number">{heroNumber}</span>
            <span className="dedup-hero-verb">{heroLabel}</span>
          </div>

          {/* Sub-line */}
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

          {/* Elapsed time */}
          {phase === "running" && elapsed > 0 && (
            <p className="dedup-elapsed">{fmtElapsed(elapsed)} elapsed</p>
          )}

          {/* Error detail */}
          {phase === "error" && errorMessage && (
            <p className="dedup-sheet-error">{errorMessage}</p>
          )}

          {/* Metadata: database + field */}
          <p className="dedup-sheet-meta">
            <span>{databaseName}</span>
            <span className="dedup-meta-dot">&middot;</span>
            <span>{fieldName} field</span>
          </p>

        </div>

        {/* Actions */}
        <div className="dedup-sheet-actions">
          {(phase === "running" || phase === "paused") && (
            <Button
              variant="secondary"
              onClick={() => {
                pausedRef.current = !pausedRef.current;
                setPhase(pausedRef.current ? "paused" : "running");
              }}
            >
              {phase === "paused" ? "Resume" : "Pause"}
            </Button>
          )}
          {!isOnDedupPage && (
            <Link href="/duplicate" className="dedup-act-btn dedup-act-btn--primary">
              View progress
            </Link>
          )}
          {(phase === "done" || phase === "error") && (
            <Button
              variant="ghost"
              onClick={dismissDedup}
            >
              Dismiss
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
