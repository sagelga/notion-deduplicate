// AutoDedupControls.tsx
// Pause/resume button and hints

"use client";

import Button from "@/components/ui/Button";

interface AutoDedupControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  dryRun: boolean;
  onPause: () => void;
}

export function AutoDedupControls({ isRunning, isPaused, dryRun, onPause }: AutoDedupControlsProps) {
  return (
    <div className="auto-scan-controls">
      {isRunning && (
        <span className="auto-scan-hint">
          {dryRun ? "preview mode · no changes yet" : "managing your database..."}
        </span>
      )}
      <div className="auto-scan-btns">
        {(isRunning || isPaused) && (
          <Button variant="primary" onClick={onPause}>
            {isPaused ? "Resume" : "Pause"}
          </Button>
        )}
      </div>
    </div>
  );
}
