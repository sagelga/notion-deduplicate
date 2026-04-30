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

import React, { useState } from "react";
import { useDedup } from "@/hooks/useDedup";
import { DedupProgressIsland } from "./DedupProgressIsland";
import { DedupProgressHeader } from "./DedupProgressHeader";
import { DedupProgressStats } from "./DedupProgressStats";
import { DedupProgressActions } from "./DedupProgressActions";
import "./DedupProgressBottomSheet.css";

export default function DedupProgressBottomSheet() {
  const {
    isActive, phase, mode, databaseName, fieldName,
    stats, errorMessage, pausedRef, setPhase, dismissDedup,
  } = useDedup();
  const [expanded, setExpanded] = useState(false);

  if (!isActive) return null;

  if (!expanded) {
    return (
      <DedupProgressIsland
        phase={phase}
        mode={mode}
        stats={stats}
        onClick={() => setExpanded(true)}
      />
    );
  }

  return (
    <div className="dedup-sheet-overlay" onClick={() => setExpanded(false)}>
      <div className="dedup-sheet" onClick={(e) => e.stopPropagation()}>
        <DedupProgressHeader phase={phase} onClose={() => setExpanded(false)} />

        <div className="dedup-sheet-body">
          <DedupProgressStats
            phase={phase}
            mode={mode}
            stats={stats}
            errorMessage={errorMessage}
          />

          <p className="dedup-sheet-meta">
            <span>{databaseName}</span>
            <span className="dedup-meta-dot">&middot;</span>
            <span>{fieldName} field</span>
          </p>
        </div>

        <DedupProgressActions
          phase={phase}
          pausedRef={pausedRef}
          setPhase={setPhase}
          dismissDedup={dismissDedup}
        />
      </div>
    </div>
  );
}