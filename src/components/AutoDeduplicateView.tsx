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

const PAGE_SIZE = 20;

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

  // pageMap: id → PageRow — use a ref so stream handler always sees latest
  const pageMapRef = useRef<Map<string, PageRow>>(new Map());
  const [rows, setRows] = useState<PageRow[]>([]);

  // Register with context on mount
  useEffect(() => {
    dedup.startDedup({ databaseId, databaseName, fieldName, mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, databaseName, fieldName, mode]);

  // Control ref for pause — share with context
  const localPausedRef = useRef(false);

  // Sync context pausedRef with local
  useEffect(() => {
    dedup.pausedRef.current = localPausedRef.current;
  });

  const updateRows = () => {
    const sorted = Array.from(pageMapRef.current.values()).sort((a, b) => {
      // Empty values sort last
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

        const flush = () => {
          if (batchDirty) {
            updateRows();
            batchDirty = false;
          }
        };

        // Batch DOM updates at 300ms — decouples render frequency from stream
        // speed, keeping the browser responsive for large databases.
        const flushInterval = setInterval(flush, 300);

        while (true) {
          if (cancelled) { flush(); clearInterval(flushInterval); break; }

          // Handle pause by waiting
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
              pageMapRef.current.set(row.id, row);
              batchDirty = true;
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
            } else if (msg.type === "actioned" || msg.type === "actionError") {
              // deleteWorker owns actioned + errors; scanned/duplicatesFound in these
              // events can lag matchWorker — only update the delete-stage counters.
              // dedup context gets the full authoritative update from the next progress event.
              setStats((prev) => ({
                ...prev,
                actioned: (msg.actioned as number) ?? prev.actioned,
                errors: (msg.errors as number) ?? prev.errors,
              }));
            } else if (msg.type === "done") {
              const newStats = {
                scanned: (msg.scanned as number) ?? 0,
                duplicatesFound: (msg.duplicatesFound as number) ?? 0,
                actioned: (msg.actioned as number) ?? 0,
                errors: (msg.errors as number) ?? 0,
              };
              setStats(newStats);
              dedup.updateStats(newStats);
              flush();
              if (dryRun) {
                setLocalPhase("preview");
                // Don't call dedup.setPhase("done") yet — run isn't actually complete
              } else {
                setLocalPhase("done");
                dedup.setPhase("done");
              }
            } else if (msg.type === "error") {
              const errMsg = (msg.message as string) ?? "Unknown error";
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

  const verb = mode === "archive" ? "archived" : "deleted";

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const start = tablePage * PAGE_SIZE;
  const visibleRows = useMemo(
    () => rows.slice(start, start + PAGE_SIZE),
    [rows, start]
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

        {/* Spinner + pause inline */}
        {(phase === "running" || phase === "paused") && (
          <div className="auto-spinner-group">
            {phase === "running" && <div className="auto-spinner" />}
            <button onClick={handlePause} className="auto-pause-btn">
              {phase === "paused" ? "Resume" : "Pause"}
            </button>
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

      {/* Live table */}
      {rows.length > 0 && (
        <div className="auto-table-wrap">
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
                    <td className="auto-cell-field">{row.fieldValue}</td>
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

      {(phase === "done" || phase === "error" || phase === "paused") && (
        <a href="/duplicate" className="auto-dedup-back">Back to Duplicate</a>
      )}
    </div>
  );
}
