// DedupDoneView.tsx — S5 completion screen
// Before/after bar chart, −N delta in accent, stats receipt.

"use client";

import type { Stats, Mode } from "./dedup-types";
import "./DedupDoneView.css";

interface DedupDoneViewProps {
  stats: Stats;
  mode: Mode;
  databaseName: string;
  fieldName: string;
  elapsedMs: number;
  onScanAnother: () => void;
  onHome: () => void;
}

export function DedupDoneView({
  stats,
  mode,
  databaseName,
  fieldName,
  elapsedMs,
  onScanAnother,
  onHome,
}: DedupDoneViewProps) {
  const before = stats.scanned;
  const after = stats.scanned - stats.actioned;
  const pct = before > 0 ? after / before : 1;
  const verb = mode === "archive" ? "archived" : "deleted";
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="ddv-wrapper">
      <p className="ddv-breadcrumb">
        {databaseName} · {fieldName}
      </p>
      <h1 className="ddv-title">Done.</h1>

      {/* Before / After bars */}
      {[
        { label: "Before", n: before, w: 1, bold: false },
        { label: "After",  n: after,  w: pct, bold: true  },
      ].map((b) => (
        <div key={b.label} className="ddv-bar-row">
          <div className="ddv-bar-meta">
            <span className="ddv-bar-label">{b.label}</span>
            <span className={`ddv-bar-count${b.bold ? " ddv-bar-count--bold" : ""}`}>
              {b.n} pages
            </span>
          </div>
          <div className="ddv-bar-track">
            <div
              className="ddv-bar-fill"
              style={{ width: `${b.w * 100}%`, background: b.bold ? "var(--nd-text)" : "var(--nd-divider-strong)" }}
            />
          </div>
        </div>
      ))}

      {/* Delta + stats */}
      <div className="ddv-delta-row">
        <div className="ddv-delta-block">
          <div className="ddv-delta-number">−{stats.actioned}</div>
          <div className="ddv-delta-label">duplicate pages {verb}</div>
        </div>
        <div className="ddv-receipt">
          <div className="ddv-receipt-line">elapsed: {elapsedSec}s</div>
          <div className="ddv-receipt-line">workers: 3 parallel</div>
          <div className="ddv-receipt-line">errors: {stats.errors}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="ddv-actions">
        <button className="ddv-btn ddv-btn--primary" onClick={onScanAnother}>
          Scan another database
        </button>
        <button className="ddv-btn ddv-btn--ghost" onClick={onHome}>
          Back to home
        </button>
      </div>
    </div>
  );
}
