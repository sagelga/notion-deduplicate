// AutoDedupControls.tsx
// Pause/resume button and hints

"use client";

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
          {dryRun ? "preview mode · no changes yet" : "you can start reviewing visible groups now"}
        </span>
      )}
      <div className="auto-scan-btns">
        {(isRunning || isPaused) && (
          <button className="auto-pause-btn" onClick={onPause}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        )}
      </div>
    </div>
  );
}
