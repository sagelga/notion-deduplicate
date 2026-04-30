// AutoDeduplicateView.tsx
//
// Orchestrates the deduplication pipeline UI across all phases:
//   S3 (running/paused) → scan view with large counters + progress bar
//   S4 (preview)        → DedupReviewGroups keep/delete split cards (dryRun only)
//   S5 (done)           → DedupDoneView before/after bars + stats
//   S6 (done + 0 dupes) → DedupEmptyView all-clean state

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDedup } from "@/hooks/useDedup";
import { useAutoDeduplicate } from "@/hooks/useAutoDeduplicate";
import type { Mode, Phase, Stats } from "./dedup-types";
import { DedupResultsTable } from "./DedupResultsTable";
import { DedupLogPanel } from "./DedupLogPanel";
import { DedupReviewGroups } from "./DedupReviewGroups";
import { DedupDoneView } from "./DedupDoneView";
import { DedupEmptyView } from "./DedupEmptyView";
import { DedupStatsBar } from "./DedupStatsBar";
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
  onReset,
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
  onReset?: () => void;
  token: string;
}) {
  const router = useRouter();
  const {
    startDedup,
    updateStats: dedupUpdateStats,
    setPhase: dedupSetPhase,
    setErrorMessage: dedupSetErrorMessage,
    pausedRef,
  } = useDedup();
  const [phase, setLocalPhase] = useState<Phase>("running");
  const setPhase = (p: Phase) => { setLocalPhase(p); onPhaseChange?.(p); };
  const [stats, setStats] = useState<Stats>({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    phase: pipelinePhase,
    activeStage,
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

  const autoScrollRef = useRef(true);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const localPausedRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => { pausedRef.current = localPausedRef.current; });

  useEffect(() => {
    if (!autoScrollRef.current || !logScrollRef.current) return;
    logScrollRef.current.scrollTop = 0;
  }, [logs]);

  const handleLogScroll = () => {
    const el = logScrollRef.current;
    if (!el) return;
    if (el.scrollTop < 8) autoScrollRef.current = true;
    else if (autoScrollRef.current) autoScrollRef.current = false;
  };

  useEffect(() => {
    autoScrollRef.current = true;
    startedAtRef.current = Date.now();
    if (!dryRun) startDedup({ databaseId, databaseName, fieldName, mode });
    start();
    return () => { stopPipeline(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, fieldName, mode, skipEmpty, dryRun]);

  useEffect(() => { setPhase(pipelinePhase); }, [pipelinePhase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setStats(pipelineStats); }, [pipelineStats]);

  useEffect(() => {
    dedupUpdateStats(pipelineStats);
    if (pipelinePhase === "done" && !dryRun) dedupSetPhase("done");
  }, [pipelineStats, pipelinePhase, dryRun, dedupUpdateStats, dedupSetPhase]);

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
    if (nowPaused) pause(); else resume();
  };

  const handleExport = () => {
    const endedAt = new Date().toISOString();
    const firstLog = allLogsRef.current[0];
    const startedAtMs = firstLog?.absTs ?? Date.now();
    const payload = {
      session: { databaseId, databaseName, fieldName, mode, skipEmpty, dryRun, startedAt: new Date(startedAtMs).toISOString(), endedAt, elapsedMs: Date.now() - startedAtMs },
      summary: stats,
      events: allLogsRef.current.map((e) => ({ ts: e.ts, timestamp: new Date(e.absTs).toISOString(), type: e.type, level: e.level, message: e.message, raw: e.raw })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `notion-dedup-${databaseName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.href = blobUrl;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const verb = mode === "archive" ? "archived" : "deleted";

  const displayLogs = useMemo(
    () => logs.filter((e) => {
      if (e.type === "start") return true;
      if (e.type === "actioned") return false;
      if (e.type === "page" && (e.raw.status === "kept" || e.raw.status === "skipped")) return false;
      return true;
    }),
    [logs]
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "pending") return rows.filter((r) => r.status === "pending");
    if (statusFilter === "kept") return rows.filter((r) => r.status === "kept");
    if (statusFilter === "actioned") return rows.filter((r) => r.status === "deleted" || r.status === "archived");
    if (statusFilter === "errors") return rows.filter((r) => r.status === "error");
    if (statusFilter === "skipped") return rows.filter((r) => r.status === "skipped");
    return rows;
  }, [rows, statusFilter]);

  // Count unique duplicate groups (field values that have pending rows)
  const dupGroupCount = useMemo(
    () => new Set(rows.filter((r) => r.status === "pending").map((r) => r.fieldValue)).size,
    [rows]
  );

  const isRunning = phase === "running";
  const isPaused = phase === "paused";

  // ── S6 empty state ─────────────────────────────────────────────
  if ((phase === "done" || phase === "preview") && stats.duplicatesFound === 0) {
    return (
      <DedupEmptyView
        stats={stats}
        fieldName={fieldName}
        databaseName={databaseName}
        onChangeDatabase={() => onReset?.()}
      />
    );
  }

  // ── S5 done state (non-dry-run) ────────────────────────────────
  if (!dryRun && phase === "done" && stats.actioned > 0) {
    return (
      <DedupDoneView
        stats={stats}
        mode={mode}
        databaseName={databaseName}
        fieldName={fieldName}
        elapsedMs={Date.now() - startedAtRef.current}
        onScanAnother={() => onReset?.()}
        onHome={() => router.push("/")}
      />
    );
  }

  // ── S4 review groups (dry-run preview) ─────────────────────────
  if (dryRun && phase === "preview") {
    return (
      <DedupReviewGroups
        rows={rows}
        stats={stats}
        mode={mode}
        onConfirm={onConfirm}
        onCancel={() => onReset?.()}
      />
    );
  }

  return (
    <div className="auto-dedup-wrapper">
      {/* Heading */}
      <div className="auto-scan-heading">
        <h1 className="auto-scan-title-lg">
          {isRunning ? "Scanning…" : isPaused ? "Paused" : "Scan complete"}
        </h1>
        {isRunning && (
          <span className="auto-scan-page-count">
            {stats.scanned} pages scanned · {databaseName}
          </span>
        )}
        {!isRunning && !isPaused && phase !== "error" && (
          <span className="auto-scan-complete-tag">
            {dupGroupCount} groups found
          </span>
        )}
      </div>

      {/* Indeterminate progress bar during scan */}
      {(isRunning || isPaused) && (
        <div className="auto-scan-bar-track">
          <div className={`auto-scan-bar-fill${isPaused ? " auto-scan-bar-fill--paused" : ""}`} />
        </div>
      )}

      {/* Stats bar with click-to-filter counters */}
      {(isRunning || isPaused || phase === "done") && (
        <DedupStatsBar
          stats={stats}
          verb={verb}
          phase={phase}
          activeStage={activeStage}
          dryRun={dryRun}
          onPause={isPaused ? resume : pause}
          onStatClick={setStatusFilter}
        />
      )}

      {/* Queue info notice — shown while deletion is running */}
      {(isRunning || isPaused) && !dryRun && stats.duplicatesFound > 0 && (
        <div className="auto-queue-notice auto-queue-notice--info">
          <span className="auto-queue-notice__icon">⏳</span>
          <span>
            Deletions are queued due to Notion API limits — pages are removed one at a time.
            First-attempt failures are retried automatically once.
          </span>
        </div>
      )}

      {/* Manual deletion notice — shown after completion if permanent failures exist */}
      {phase === "done" && stats.errors > 0 && (
        <div className="auto-queue-notice auto-queue-notice--warn">
          <span className="auto-queue-notice__icon">⚠️</span>
          <div>
            <strong>{stats.errors} {stats.errors === 1 ? "page" : "pages"} could not be deleted after 2 attempts.</strong>
            <span> Open each page marked <em>failed</em> in the table below and delete it manually in Notion, or re-run the scan.</span>
          </div>
        </div>
      )}

      {phase === "error" && <div className="auto-dedup-error">{errorMessage}</div>}

      {/* Results table */}
      <DedupResultsTable rows={filteredRows} fieldName={fieldName} dryRun={dryRun} phase={phase} />

      {/* Controls */}
      <div className="auto-scan-controls">
        {isRunning && (
          <span className="auto-scan-hint">
            {dryRun ? "preview mode · no changes yet" : "you can start reviewing visible groups now"}
          </span>
        )}
        <div className="auto-scan-btns">
          {(isRunning || isPaused) && (
            <button className="auto-pause-btn" onClick={handlePause}>
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </div>

      {/* Log panel */}
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
