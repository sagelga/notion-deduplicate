"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDedup } from "@/hooks/useDedup";
import "./DedupProgressBottomSheet.css";

export default function DedupProgressBottomSheet() {
  const { isActive, phase, mode, databaseName, fieldName, stats, errorMessage, pausedRef, setPhase, dismissDedup } =
    useDedup();
  const [expanded, setExpanded] = useState(false);

  if (!isActive) return null;

  const verb = mode === "archive" ? "Archived" : "Deleted";

  // Collapsed view
  if (!expanded) {
    return (
      <div className="dedup-progress-bar" onClick={() => setExpanded(true)}>
        <div className="dedup-progress-bar-inner">
          {phase === "running" && <div className="dedup-mini-spinner" />}
          {phase === "paused" && <span className="dedup-paused-icon">⏸</span>}
          {phase === "error" && <span className="dedup-error-icon">⚠</span>}
          {phase === "done" && <span className="dedup-done-icon">✓</span>}
          <span className="dedup-progress-text">
            {stats.scanned} scanned · {stats.actioned} {verb.toLowerCase()}
          </span>
        </div>
        <div
          className="dedup-progress-bar-bg"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <div
            className="dedup-progress-fill"
            style={{
              width: stats.scanned > 0 ? `${Math.min((stats.actioned / stats.scanned) * 100, 100)}%` : "0%",
            }}
          />
        </div>
      </div>
    );
  }

  // Expanded
  return (
    <div className="dedup-bottom-sheet-overlay" onClick={() => setExpanded(false)}>
      <div className="dedup-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dedup-sheet-drag-handle" />
        <div className="dedup-sheet-header">
          <h2>Deduplication Progress</h2>
          <button
            className="dedup-sheet-close"
            onClick={() => setExpanded(false)}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="dedup-sheet-body">
          {/* Info */}
          <div className="dedup-info">
            <p className="dedup-info-row">
              <span className="dedup-info-label">Database</span>
              <span>{databaseName}</span>
            </p>
            <p className="dedup-info-row">
              <span className="dedup-info-label">Field</span>
              <span>{fieldName}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="dedup-stats-grid">
            <div className="dedup-stat-card">
              <span className="dedup-stat-value">{stats.scanned}</span>
              <span className="dedup-stat-label">Scanned</span>
            </div>
            <div className="dedup-stat-card">
              <span className="dedup-stat-value">{stats.duplicatesFound}</span>
              <span className="dedup-stat-label">Duplicates</span>
            </div>
            <div className="dedup-stat-card">
              <span className="dedup-stat-value stat-success">{stats.actioned}</span>
              <span className="dedup-stat-label">{verb}</span>
            </div>
            <div className="dedup-stat-card">
              <span className={`dedup-stat-value ${stats.errors > 0 ? "stat-error" : ""}`}>
                {stats.errors}
              </span>
              <span className="dedup-stat-label">Errors</span>
            </div>
          </div>

          {/* Progress bar */}
          {stats.scanned > 0 && (
            <div className="dedup-progress-track">
              <div className="dedup-progress-bar-full">
                <div
                  className="dedup-progress-fill-full"
                  style={{
                    width: `${Math.min((stats.actioned / stats.scanned) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="dedup-progress-pct">
                {Math.round((stats.actioned / stats.scanned) * 100)}%
              </span>
            </div>
          )}

          {/* Phase status */}
          {phase === "running" && (
            <div className="dedup-status-row">
              <div className="dedup-spinner-sm" />
              <span>Processing…</span>
            </div>
          )}
          {phase === "paused" && (
            <div className="dedup-status-row dedup-status-paused">
              <span>⏸ Paused</span>
            </div>
          )}
          {phase === "done" && (
            <div className="dedup-status-row dedup-status-done">
              <span>✓ Done — {stats.actioned} pages {verb.toLowerCase()}</span>
            </div>
          )}
          {phase === "error" && (
            <div className="dedup-status-row dedup-status-error">
              <span>⚠ Error: {errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="dedup-actions">
            {(phase === "running" || phase === "paused") && (
              <button
                className="dedup-action-btn dedup-action-btn--pause"
                onClick={() => {
                  pausedRef.current = !pausedRef.current;
                  setPhase(pausedRef.current ? "paused" : "running");
                }}
              >
                {phase === "paused" ? "▶ Resume" : "⏸ Pause"}
              </button>
            )}
            <Link href="/duplicate" className="dedup-action-btn dedup-action-btn--go">
              Go to Dedup
            </Link>
            {(phase === "done" || phase === "error") && (
              <button
                className="dedup-action-btn dedup-action-btn--dismiss"
                onClick={dismissDedup}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
