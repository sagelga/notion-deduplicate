"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./AutoDeduplicateView.css";

type Mode = "archive" | "delete";
type PageStatus = "kept" | "archived" | "deleted" | "skipped" | "error";

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

type Phase = "running" | "done" | "error";

const PAGE_SIZE = 20;

const STATUS_ORDER: Record<PageStatus, number> = {
  kept: 0,
  archived: 1,
  deleted: 1,
  error: 2,
  skipped: 3,
};

export default function AutoDeduplicateView({
  databaseId,
  fieldName,
  mode,
  skipEmpty,
}: {
  databaseId: string;
  fieldName: string;
  mode: Mode;
  skipEmpty: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("running");
  const [stats, setStats] = useState<Stats>({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0 });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [tablePage, setTablePage] = useState(0);

  // pageMap: id → PageRow — use a ref so stream handler always sees latest
  const pageMapRef = useRef<Map<string, PageRow>>(new Map());
  // Sorted array for display — derived state, rebuilt on each render tick
  const [rows, setRows] = useState<PageRow[]>([]);

  const updateRows = () => {
    const sorted = Array.from(pageMapRef.current.values()).sort((a, b) => {
      const fv = a.fieldValue.localeCompare(b.fieldValue);
      if (fv !== 0) return fv;
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    });
    setRows(sorted);
  };

  useEffect(() => {
    const url =
      `/api/deduplicate/auto?databaseId=${encodeURIComponent(databaseId)}` +
      `&field=${encodeURIComponent(fieldName)}&mode=${mode}&skipEmpty=${skipEmpty}`;
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

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) { flush(); break; }

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
            } else if (msg.type === "progress" || msg.type === "actioned" || msg.type === "actionError") {
              setStats({
                scanned: (msg.scanned as number) ?? 0,
                duplicatesFound: (msg.duplicatesFound as number) ?? 0,
                actioned: (msg.actioned as number) ?? 0,
                errors: (msg.errors as number) ?? 0,
              });
              flush();
            } else if (msg.type === "done") {
              setStats({
                scanned: (msg.scanned as number) ?? 0,
                duplicatesFound: (msg.duplicatesFound as number) ?? 0,
                actioned: (msg.actioned as number) ?? 0,
                errors: (msg.errors as number) ?? 0,
              });
              flush();
              setPhase("done");
            } else if (msg.type === "error") {
              setErrorMessage((msg.message as string) ?? "Unknown error");
              setPhase("error");
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
          setPhase("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [databaseId, fieldName, mode, skipEmpty]);

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
        {stats.errors > 0 && (
          <div className="auto-dedup-stat">
            <span className="auto-stat-value val-error">{stats.errors}</span>
            <span className="auto-stat-label">errors</span>
          </div>
        )}
        {phase === "running" && <div className="db-spinner auto-spinner" />}
      </div>

      {phase === "error" && <div className="auto-dedup-error">{errorMessage}</div>}
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
                    <td className="auto-cell-title">{row.title}</td>
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

      {(phase === "done" || phase === "error") && (
        <a href="/dashboard" className="auto-dedup-back">Back to Dashboard</a>
      )}
    </div>
  );
}
