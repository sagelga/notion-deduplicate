// AutoDeduplicateView.tsx
//
// The main view rendered when a deduplication run is active. It orchestrates the
// useAutoDeduplicate hook and renders all the child UI components (stats bar,
// results table, log panel, preview/confirm, scan progress).
//
// Key design points:
// - useAutoDeduplicate runs the 3-stage dedup pipeline in the browser; this component
//   calls its start/pause/resume/stop controls and syncs its phase/stats to local state
//   and the global dedup context.
// - DOM updates are batched at 300ms inside useAutoDeduplicate to avoid thrashing React.
// - dryRun mode: pending rows are buffered during scan and revealed atomically on done.
// - Logs are stored in allLogsRef for export completeness; a sliced/reversed copy is
//   pushed to state only for the visible panel (LOG_DISPLAY_LIMIT entries).
// - Pause is implemented via a mutable ref shared with the parent context so the
//   pipeline can check it without a React re-render cycle.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDedup } from "@/hooks/useDedup";
import { useAutoDeduplicate } from "@/hooks/useAutoDeduplicate";
import type { Mode, Phase, Stats } from "./dedup-types";
import { DedupStatsBar } from "./DedupStatsBar";
import { DedupScanProgress } from "./DedupScanProgress";
import { DedupResultsTable } from "./DedupResultsTable";
import { DedupPreviewConfirm } from "./DedupPreviewConfirm";
import { DedupLogPanel } from "./DedupLogPanel";
import "./AutoDeduplicateView.css";

export default function AutoDeduplicateView({
  databaseId,
  databaseName,
  fieldName,
  mode,
  skipEmpty,
  dryRun = false,
  onConfirm,
  onPhaseChange,
  token,
}: {
  databaseId: string;
  databaseName: string;
  fieldName: string;
  mode: Mode;
  skipEmpty: boolean;
  dryRun?: boolean;
  onConfirm?: () => void;
  onPhaseChange?: (phase: Phase) => void;
  token: string;
}) {
  const {
    startDedup,
    updateStats: dedupUpdateStats,
    setPhase: dedupSetPhase,
    setErrorMessage: dedupSetErrorMessage,
    pausedRef,
  } = useDedup();
  const [phase, setLocalPhase] = useState<Phase>("running");
  const setPhase = (p: Phase) => { setLocalPhase(p); onPhaseChange?.(p); };
  const [stats, setStats] = useState<Stats>({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0 });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeStage] = useState<string>("");

  // Call the hook — runs 3-stage pipeline in browser
  const {
    phase: pipelinePhase,
    stats: pipelineStats,
    rows,
    logs,
    allLogsRef,
    start,
    pause,
    resume,
    stop: stopPipeline,
  } = useAutoDeduplicate({
    databaseId,
    fieldName,
    token,
    mode,
    skipEmpty,
    dryRun,
  });

  // Auto-scroll control: true = scroll to top automatically, false = user is scrolling manually
  const autoScrollRef = useRef(true);
  const logScrollRef = useRef<HTMLDivElement>(null);


  // Control ref for pause — share with context
  const localPausedRef = useRef(false);

  // Sync context pausedRef with local
  useEffect(() => {
    pausedRef.current = localPausedRef.current;
  });

  // Auto-scroll: when logs update and auto-scroll is on, pin to top (newest entry)
  useEffect(() => {
    if (!autoScrollRef.current || !logScrollRef.current) return;
    logScrollRef.current.scrollTop = 0;
  }, [logs]);

  const handleLogScroll = () => {
    const el = logScrollRef.current;
    if (!el) return;
    if (el.scrollTop < 8) {
      // User scrolled back to top — resume auto-scroll
      autoScrollRef.current = true;
    } else if (autoScrollRef.current) {
      // User scrolled away from top — switch to manual
      autoScrollRef.current = false;
    }
  };

  // Reset auto-scroll and start the pipeline on mount; register with context for navbar
  useEffect(() => {
    autoScrollRef.current = true;
    if (!dryRun) {
      startDedup({ databaseId, databaseName, fieldName, mode });
    }
    start();
    return () => {
      stopPipeline();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, fieldName, mode, skipEmpty, dryRun]);

  // Sync pipeline phase to local state + parent callback
  useEffect(() => {
    setPhase(pipelinePhase);
  }, [pipelinePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep component stats state synced with hook
  useEffect(() => {
    setStats(pipelineStats);
  }, [pipelineStats]);

  // Update global dedup context stats and phase when pipeline updates
  useEffect(() => {
    dedupUpdateStats(pipelineStats);
    if (pipelinePhase === "done" && !dryRun) {
      dedupSetPhase("done");
    }
  }, [pipelineStats, pipelinePhase, dryRun, dedupUpdateStats, dedupSetPhase]);

  // Capture error message from last error log entry when phase is "error"
  useEffect(() => {
    if (pipelinePhase === "error") {
      const lastError = [...allLogsRef.current].reverse().find((e) => e.level === "error");
      if (lastError) {
        setErrorMessage(lastError.message.replace(/^FATAL ERROR — /, ""));
        dedupSetErrorMessage(lastError.message.replace(/^FATAL ERROR — /, ""));
      }
    }
  }, [pipelinePhase, dedupSetErrorMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = () => {
    const nowPaused = !localPausedRef.current;
    localPausedRef.current = nowPaused;
    pausedRef.current = nowPaused;
    if (nowPaused) {
      pause();
    } else {
      resume();
    }
  };

  const handleExport = () => {
    const endedAt = new Date().toISOString();
    // Calculate elapsed time from first log entry's absTs to now
    const firstLog = allLogsRef.current[0];
    const startedAtMs = firstLog?.absTs ?? Date.now();
    const payload = {
      session: {
        databaseId,
        databaseName,
        fieldName,
        mode,
        skipEmpty,
        dryRun,
        startedAt: new Date(startedAtMs).toISOString(),
        endedAt,
        elapsedMs: Date.now() - startedAtMs,
      },
      summary: stats,
      // All events in chronological order (ascending)
      events: allLogsRef.current.map((e) => ({
        ts: e.ts,
        timestamp: new Date(e.absTs).toISOString(),
        type: e.type,
        level: e.level,
        message: e.message,
        raw: e.raw,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = databaseName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const date = new Date().toISOString().slice(0, 10);
    a.download = `notion-dedup-${safeName}-${date}.json`;
    a.href = blobUrl;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const verb = mode === "archive" ? "archived" : "deleted";

  // Filter the full log list down to what's useful to display in the panel.
  // actioned events are redundant with the stats bar; kept/skipped page events
  // aren't actionable. progress events are shown so the log doesn't appear
  // frozen during long scans.
  // The export (via handleExport) always gets the unfiltered allLogsRef.current.
  const displayLogs = useMemo(
    () => logs.filter((e) => {
      if (e.type === "start") return true;
      if (e.type === "actioned") return false;
      if (e.type === "page" && (e.raw.status === "kept" || e.raw.status === "skipped")) return false;
      return true;
    }),
    [logs]
  );

  return (
    <div className="auto-dedup-wrapper">
      <DedupStatsBar
        stats={stats}
        verb={verb}
        phase={phase}
        activeStage={activeStage}
        dryRun={dryRun}
        onPause={handlePause}
      />

      {phase === "error" && <div className="auto-dedup-error">{errorMessage}</div>}
      {phase === "paused" && (
        <div className="auto-dedup-paused">
          Paused — {stats.scanned} scanned, {stats.actioned} {verb}.
        </div>
      )}
      {phase === "done" && (
        <div className="auto-dedup-done">
          Done — {stats.actioned} pages {verb}, {stats.scanned} total scanned.
        </div>
      )}

      {dryRun && phase === "running" && <DedupScanProgress stats={stats} />}

      <DedupResultsTable rows={rows} fieldName={fieldName} dryRun={dryRun} phase={phase} />

      {phase === "preview" && (
        <DedupPreviewConfirm stats={stats} mode={mode} onConfirm={onConfirm} />
      )}

      <DedupLogPanel
        displayLogs={displayLogs}
        totalLogCount={allLogsRef.current.length}
        onExport={handleExport}
        logScrollRef={logScrollRef}
        onScroll={handleLogScroll}
      />
    </div>
  );
}
