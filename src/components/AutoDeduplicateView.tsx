"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDedup } from "@/hooks/useDedup";
import "./AutoDeduplicateView.css";

type Mode = "archive" | "delete";
type PageStatus = "kept" | "archived" | "deleted" | "skipped" | "error" | "pending";

interface PageRow {
  id: string;
  title: string;
  fieldValue: string;
  status: PageStatus;
}

interface Stats {
  scanned: number;
  duplicatesFound: number;
  actioned: number;
  errors: number;
}

type Phase = "running" | "paused" | "done" | "error" | "preview";

interface LogEntry {
  /** ms since session start */
  ts: number;
  /** Unix ms — used for export */
  absTs: number;
  type: string;
  level: "info" | "warn" | "error";
  message: string;
  /** Full raw NDJSON event — preserved for export/debugging */
  raw: Record<string, unknown>;
}

const PAGE_SIZE = 20;
/** Max entries rendered in the log panel; export always has the full set */
const LOG_DISPLAY_LIMIT = 500;

const STATUS_ORDER: Record<PageStatus, number> = {
  kept: 0,
  archived: 1,
  deleted: 1,
  pending: 1,
  error: 2,
  skipped: 3,
};

function notionPageUrl(id: string) {
  return `https://www.notion.so/${id.replace(/-/g, "")}`;
}

function fmtTs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function formatDateField(value: string): string {
  // Try to parse as ISO date (YYYY-MM-DD or full ISO timestamp)
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value;
  }

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toISOString().split("T")[0];
    const todayOnly = today.toISOString().split("T")[0];
    const yesterdayOnly = yesterday.toISOString().split("T")[0];

    if (dateOnly === todayOnly) return "Today";
    if (dateOnly === yesterdayOnly) return "Yesterday";

    // Format as "Apr 9, 2026"
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function AutoDeduplicateView({
  databaseId,
  databaseName,
  fieldName,
  mode,
  skipEmpty,
  dryRun = false,
  onConfirm,
}: {
  databaseId: string;
  databaseName: string;
  fieldName: string;
  mode: Mode;
  skipEmpty: boolean;
  dryRun?: boolean;
  onConfirm?: () => void;
}) {
  const dedup = useDedup();
  const [phase, setLocalPhase] = useState<Phase>("running");
  const [stats, setStats] = useState<Stats>({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0 });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [tablePage, setTablePage] = useState(0);
  const [activeStage, setActiveStage] = useState<string>("");

  // pageMap: id → PageRow — use a ref so stream handler always sees latest
  const pageMapRef = useRef<Map<string, PageRow>>(new Map());
  // In dryRun mode: buffer pending rows during scan, reveal all at once on done
  const pendingBufferRef = useRef<PageRow[] | null>(dryRun ? [] : null);
  const [rows, setRows] = useState<PageRow[]>([]);

  // Logs — all raw entries live in a ref; state holds the rendered slice
  const logsRef = useRef<LogEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Auto-scroll control: true = scroll to top automatically, false = user is scrolling manually
  const autoScrollRef = useRef(true);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // Auto-open logs on first load (when running starts)
  useEffect(() => {
    if (phase === "running" && !showLogs) {
      setShowLogs(true);
    }
  }, [phase, showLogs]);

  // Register with context on mount — only for real runs, not dry-run preview scans
  useEffect(() => {
    if (!dryRun) {
      dedup.startDedup({ databaseId, databaseName, fieldName, mode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, databaseName, fieldName, mode, dryRun]);

  // Control ref for pause — share with context
  const localPausedRef = useRef(false);

  // Sync context pausedRef with local
  useEffect(() => {
    dedup.pausedRef.current = localPausedRef.current;
  });

  // Auto-scroll: when logs update and auto-scroll is on, pin to top (newest entry)
  useEffect(() => {
    if (!showLogs || !autoScrollRef.current || !logScrollRef.current) return;
    logScrollRef.current.scrollTop = 0;
  }, [logs, showLogs]);

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

  const updateRows = () => {
    const sorted = Array.from(pageMapRef.current.values()).sort((a, b) => {
      const aEmpty = a.fieldValue === "(empty)";
      const bEmpty = b.fieldValue === "(empty)";
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;

      const fv = a.fieldValue < b.fieldValue ? -1 : a.fieldValue > b.fieldValue ? 1 : 0;
      if (fv !== 0) return fv;
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    });
    setRows(sorted);
  };

  useEffect(() => {
    // Reset log state for new session
    logsRef.current = [];
    startTimeRef.current = Date.now();
    autoScrollRef.current = true;
    setLogs([]);

    const url =
      `/api/deduplicate/auto?databaseId=${encodeURIComponent(databaseId)}` +
      `&field=${encodeURIComponent(fieldName)}&mode=${mode}&skipEmpty=${skipEmpty}` +
      (dryRun ? `&dryRun=true` : "");
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok || !res.body) throw new Error("Failed to start auto-deduplicate");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let batchDirty = false;
        let logsDirty = false;

        const appendLog = (
          raw: Record<string, unknown>,
          level: LogEntry["level"],
          message: string
        ) => {
          const absTs = Date.now();
          logsRef.current.push({
            ts: absTs - startTimeRef.current,
            absTs,
            type: raw.type as string,
            level,
            message,
            raw,
          });
          logsDirty = true;
        };

        const flush = () => {
          if (batchDirty) {
            updateRows();
            batchDirty = false;
          }
          if (logsDirty) {
            // Reverse for newest-first display; slice to limit
            setLogs(logsRef.current.slice(-LOG_DISPLAY_LIMIT).reverse());
            logsDirty = false;
          }
        };

        // Batch DOM updates at 300ms — decouples render frequency from stream speed
        const flushInterval = setInterval(flush, 300);

        while (true) {
          if (cancelled) { flush(); clearInterval(flushInterval); break; }

          while (localPausedRef.current && !cancelled) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          if (cancelled) { flush(); clearInterval(flushInterval); break; }

          const { done, value } = await reader.read();
          if (done) { flush(); clearInterval(flushInterval); break; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let msg: Record<string, unknown>;
            try { msg = JSON.parse(line); } catch { continue; }

            if (msg.type === "page") {
              const row: PageRow = {
                id: msg.id as string,
                title: msg.title as string,
                fieldValue: msg.fieldValue as string,
                status: msg.status as PageStatus,
              };
              if (dryRun && pendingBufferRef.current !== null) {
                // Buffer pending rows; kept/skipped are irrelevant for preview
                if (row.status === "pending") {
                  pendingBufferRef.current.push(row);
                }
              } else {
                pageMapRef.current.set(row.id, row);
                batchDirty = true;
              }

              const id = (msg.id as string).slice(0, 8);
              const title = msg.title as string;
              const fv = msg.fieldValue as string;
              const status = msg.status as PageStatus;

              if (status === "archived" || status === "deleted") {
                appendLog(msg, "info", `[${id}] ${status.toUpperCase()} "${title}" — ${fieldName}: ${fv}`);
              } else if (status === "pending") {
                appendLog(msg, "warn", `[${id}] WOULD ${mode.toUpperCase()} "${title}" — ${fieldName}: ${fv}`);
              } else if (status === "error") {
                appendLog(msg, "error", `[${id}] PAGE ERROR "${title}" — ${fieldName}: ${fv}`);
              } else {
                // kept / skipped — log for export, skipped from UI display
                appendLog(msg, "info", `[${id}] ${status} "${title}" — ${fieldName}: ${fv}`);
              }
            } else if (msg.type === "stage") {
              // Stage transitions: fetch → match → delete/preview
              const stage = msg.stage as string;
              const stageMsg = msg.message as string;
              setActiveStage(stage);
              appendLog(msg, "info", `[STAGE] ${stageMsg}`);
            } else if (msg.type === "notionAPI") {
              // Notion API calls: batch fetch, archive, delete
              const apiMsg = msg.message as string;
              appendLog(msg, "info", `[API] ${apiMsg}`);
            } else if (msg.type === "progress") {
              // matchWorker owns scanned + duplicatesFound; also carries latest actioned/errors
              const newStats = {
                scanned: (msg.scanned as number) ?? 0,
                duplicatesFound: (msg.duplicatesFound as number) ?? 0,
                actioned: (msg.actioned as number) ?? 0,
                errors: (msg.errors as number) ?? 0,
              };
              setStats(newStats);
              dedup.updateStats(newStats);
              // Log for export only — too frequent for UI display
              appendLog(msg, "info",
                `progress — scanned: ${msg.scanned}, dupes: ${msg.duplicatesFound}, actioned: ${msg.actioned}, errors: ${msg.errors}`
              );
            } else if (msg.type === "actioned" || msg.type === "actionError") {
              // deleteWorker owns actioned + errors only — scanned/duplicatesFound
              // in these events can lag matchWorker, so don't overwrite those counters.
              setStats((prev) => ({
                ...prev,
                actioned: (msg.actioned as number) ?? prev.actioned,
                errors: (msg.errors as number) ?? prev.errors,
              }));
              if (msg.type === "actionError") {
                const id = (msg.pageId as string ?? "").slice(0, 8);
                appendLog(msg, "error",
                  `[${id}] FAILED to ${mode} "${msg.title}": ${msg.error}`
                );
              }
              // "actioned" event is redundant with the page status change — skip UI log
            } else if (msg.type === "done") {
              const newStats = {
                scanned: (msg.scanned as number) ?? 0,
                duplicatesFound: (msg.duplicatesFound as number) ?? 0,
                actioned: (msg.actioned as number) ?? 0,
                errors: (msg.errors as number) ?? 0,
              };
              setStats(newStats);
              dedup.updateStats(newStats);
              appendLog(msg, "info",
                `DONE — ${msg.scanned} scanned, ${msg.duplicatesFound} duplicates found, ${msg.actioned} ${mode}d, ${msg.errors} errors`
              );
              // For dryRun: flush buffered pending rows into pageMapRef all at once
              if (dryRun && pendingBufferRef.current !== null) {
                for (const row of pendingBufferRef.current) {
                  pageMapRef.current.set(row.id, row);
                }
                pendingBufferRef.current = null;
                updateRows();
              }
              flush();
              if (dryRun) {
                setLocalPhase("preview");
              } else {
                setLocalPhase("done");
                dedup.setPhase("done");
              }
            } else if (msg.type === "error") {
              const errMsg = (msg.message as string) ?? "Unknown error";
              appendLog(msg, "error", `FATAL ERROR — ${errMsg}`);
              setErrorMessage(errMsg);
              flush();
              setLocalPhase("error");
              dedup.setErrorMessage(errMsg);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          setErrorMessage(errMsg);
          setLocalPhase("error");
          dedup.setErrorMessage(errMsg);
        }
      }
    })();

    return () => {
      cancelled = true;
      localPausedRef.current = false;
    };
  }, [databaseId, fieldName, mode, skipEmpty, dryRun, dedup]);

  const handlePause = () => {
    localPausedRef.current = !localPausedRef.current;
    dedup.pausedRef.current = localPausedRef.current;
    setLocalPhase(localPausedRef.current ? "paused" : "running");
    dedup.setPhase(localPausedRef.current ? "paused" : "running");
  };

  const handleExport = () => {
    const endedAt = new Date().toISOString();
    const payload = {
      session: {
        databaseId,
        databaseName,
        fieldName,
        mode,
        skipEmpty,
        dryRun,
        startedAt: new Date(startTimeRef.current).toISOString(),
        endedAt,
        elapsedMs: Date.now() - startTimeRef.current,
      },
      summary: stats,
      // All events in chronological order (ascending)
      events: logsRef.current.map((e) => ({
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

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const start = tablePage * PAGE_SIZE;
  const visibleRows = useMemo(
    () => rows.slice(start, start + PAGE_SIZE),
    [rows, start]
  );

  // UI log: exclude kept/skipped/progress/actioned (export gets everything)
  const displayLogs = useMemo(
    () => logs.filter((e) => {
      if (e.type === "progress" || e.type === "actioned") return false;
      if (e.type === "page" && (e.raw.status === "kept" || e.raw.status === "skipped")) return false;
      // Always show stage and notionAPI events
      return true;
    }),
    [logs]
  );

  return (
    <div className="auto-dedup-wrapper">
      {/* Stats bar */}
      <div className="auto-dedup-stats">
        <div className="auto-dedup-stat">
          <span className="auto-stat-value">{stats.scanned}</span>
          <span className="auto-stat-label">scanned</span>
        </div>
        <div className="auto-dedup-stat">
          <span className="auto-stat-value">{stats.duplicatesFound}</span>
          <span className="auto-stat-label">duplicates</span>
        </div>
        <div className="auto-dedup-stat">
          <span className={`auto-stat-value ${stats.actioned > 0 ? "val-success" : ""}`}>
            {stats.actioned}
          </span>
          <span className="auto-stat-label">{verb}</span>
        </div>
        <div className="auto-dedup-stat">
          <span className={`auto-stat-value ${stats.errors > 0 ? "val-error" : ""}`}>
            {stats.errors}
          </span>
          <span className="auto-stat-label">errors</span>
        </div>

        {/* Spinner + pause inline + active stage */}
        {(phase === "running" || phase === "paused") && (
          <div className="auto-spinner-group">
            {phase === "running" && <div className="auto-spinner" />}
            {activeStage && (
              <span className="auto-stage-label">
                {activeStage === "fetch" && "Fetching"}
                {activeStage === "match" && "Scanning"}
                {activeStage === "delete" && "Deleting"}
                {activeStage === "preview" && "Previewing"}
              </span>
            )}
            {!(dryRun && phase === "running") && (
              <button onClick={handlePause} className="auto-pause-btn">
                {phase === "paused" ? "Resume" : "Pause"}
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* Scanning progress card (dryRun only, while scan is in-flight) */}
      {dryRun && phase === "running" && (
        <div className="auto-scan-progress">
          <div className="auto-scan-spinner" />
          <div className="auto-scan-content">
            <p className="auto-scan-title">Scanning for duplicates…</p>
            <p className="auto-scan-sub">
              {stats.scanned > 0
                ? `${stats.scanned} pages scanned · ${stats.duplicatesFound} duplicate${stats.duplicatesFound !== 1 ? "s" : ""} found so far`
                : "Fetching pages from Notion…"}
            </p>
            <div className="auto-scan-bar-track">
              <div className="auto-scan-bar-fill" />
            </div>
          </div>
        </div>
      )}

      {/* Table — hidden during dryRun scan; revealed all at once on done */}
      {rows.length > 0 && !(dryRun && phase === "running") && (
        <div className={`auto-table-wrap${dryRun && phase === "preview" ? " auto-table-wrap--reveal" : ""}`}>
          <div className="auto-table-scroll">
            <table className="auto-table">
              <thead>
                <tr>
                  <th className="auto-th-status">Status</th>
                  <th>{fieldName}</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className={`auto-row auto-row--${row.status}`}>
                    <td>
                      <span className={`auto-badge auto-badge--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="auto-cell-field">{formatDateField(row.fieldValue)}</td>
                    <td className="auto-cell-title">
                      <a
                        href={notionPageUrl(row.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="auto-page-link"
                      >
                        {row.title}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="auto-table-pagination">
              <button
                className="db-preview-page-btn"
                disabled={tablePage === 0}
                onClick={() => setTablePage((p) => p - 1)}
              >
                ‹ Prev
              </button>
              <span className="db-preview-page-info">
                {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <button
                className="db-preview-page-btn"
                disabled={tablePage >= totalPages - 1}
                onClick={() => setTablePage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "preview" && (
        <div className="auto-dedup-preview">
          <p className="auto-preview-summary">
            Scan complete — found <strong>{stats.duplicatesFound}</strong> duplicate
            {stats.duplicatesFound !== 1 ? "s" : ""} across <strong>{stats.scanned}</strong> pages.
            {stats.duplicatesFound > 0
              ? ` ${stats.duplicatesFound} page${stats.duplicatesFound !== 1 ? "s" : ""} will be ${mode === "archive" ? "archived" : "permanently deleted"}.`
              : " No action needed."}
          </p>
          {stats.duplicatesFound > 0 && (
            <button
              className={`auto-confirm-btn${mode === "delete" ? " auto-confirm-btn--danger" : ""}`}
              onClick={onConfirm}
            >
              Confirm &amp; {mode === "archive" ? "Archive" : "Delete"} {stats.duplicatesFound} page
              {stats.duplicatesFound !== 1 ? "s" : ""}
            </button>
          )}
          {stats.duplicatesFound === 0 && (
            <a href="/duplicate" className="auto-dedup-back">Back to Duplicate</a>
          )}
        </div>
      )}

      {/* Log panel */}
      <div className="auto-log-section">
        <div className="auto-log-header">
          <button
            className="auto-log-toggle"
            onClick={() => setShowLogs((v) => !v)}
          >
            <span className="auto-log-toggle-arrow">{showLogs ? "▾" : "▸"}</span>
            Logs
            {logsRef.current.length > 0 && (
              <span className="auto-log-count">{logsRef.current.length} events</span>
            )}
          </button>
          {logsRef.current.length > 0 && (
            <button className="auto-log-export" onClick={handleExport}>
              Export JSON
            </button>
          )}
        </div>

        {showLogs && (
          <div
            className="auto-log-panel"
            ref={logScrollRef}
            onScroll={handleLogScroll}
          >
            {displayLogs.length === 0 ? (
              <div className="auto-log-empty">No events yet.</div>
            ) : (
              displayLogs.map((entry, i) => (
                <div key={i} className={`auto-log-line auto-log-line--${entry.level}`}>
                  <span className="auto-log-ts">{fmtTs(entry.ts)}</span>
                  <span className="auto-log-msg">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {(phase === "done" || phase === "error" || phase === "paused") && (
        <a href="/duplicate" className="auto-dedup-back">Back to Duplicate</a>
      )}
    </div>
  );
}
