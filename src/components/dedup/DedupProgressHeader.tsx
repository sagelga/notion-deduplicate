// DedupProgressHeader.tsx
// Header section of the expanded bottom sheet.

import type { Phase } from "./dedup-types";

interface DedupProgressHeaderProps {
  phase: Phase;
  onClose: () => void;
}

const PHASE_LABELS: Record<Phase, string> = {
  running: "Running",
  paused: "Paused",
  done: "Done",
  preview: "Preview",
  error: "Error",
};

export function DedupProgressHeader({ phase, onClose }: DedupProgressHeaderProps) {
  return (
    <div className="dedup-sheet-header">
      <div className="dedup-sheet-header-left">
        <span className="dedup-sheet-title">Deduplication</span>
        <span className={`dedup-phase-badge dedup-phase--${phase}`}>
          {PHASE_LABELS[phase] ?? "Error"}
        </span>
      </div>
      <button
        className="dedup-sheet-close"
        onClick={onClose}
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
  );
}