// useAutoDeduplicate.ts
//
// Client-side hook that runs the 3-stage deduplication pipeline entirely in the
// browser. Replaces the server-side /api/deduplicate/auto streaming endpoint.
//
// Three-stage concurrent pipeline (same logic as the removed server route):
//   Stage 1 — fetchWorker: calls paginateDatabase, strips to MinimalPage, pushes to fetchQueue
//   Stage 2 — matchWorker: O(1) seenMap lookup, oldest page wins, pushes duplicates to deleteQueue
//   Stage 3a — deleteWorkers (×3): drain deleteQueue; on failure push to retryQueue (status "retry")
//   Stage 3b — retryWorkers (×3): drain retryQueue after all first-attempts done; on failure → "error"
//   drainWorkers (×3): dry-run preview only
//
// Control flow:
//   cancelledRef — set by stop(); workers exit their loops when true
//   pausedRef    — set by pause()/resume(); matchWorker busy-waits when true
//   batchDirtyRef / logsDirtyRef — coalesce state updates into 300ms flush intervals

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  paginateDatabase,
  getDatabaseSchema,
  archivePage,
  deletePage,
  getPropertyValue,
} from "@/lib/notion";
import type { RawNotionPage } from "@/lib/notion";
import type { Mode, Phase, PageRow, Stats, LogEntry } from "@/components/dedup-types";

const LOG_DISPLAY_LIMIT = 500;

const STATUS_ORDER: Record<string, number> = {
  kept: 0,
  archived: 1,
  deleted: 1,
  pending: 1,
  error: 2,
  skipped: 3,
};

type MinimalPage = {
  id: string;
  created_time: string;
  title: string;
  fieldValue: string;
};

type DeleteTask = {
  id: string;
  title: string;
  fieldValue: string;
};

export interface UseAutoDedupOptions {
  databaseId: string;
  fieldName: string;
  token: string;
  mode: Mode;
  skipEmpty: boolean;
  dryRun: boolean;
}

export interface UseAutoDedupReturn {
  phase: Phase;
  stats: Stats;
  rows: PageRow[];
  /** Display slice: last 500 log entries, reversed (newest first). */
  logs: LogEntry[];
  /** Full unsliced log array — use for export. Ref so callers don't cause re-renders. */
  allLogsRef: React.MutableRefObject<LogEntry[]>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useAutoDeduplicate({
  databaseId,
  fieldName,
  token,
  mode,
  skipEmpty,
  dryRun,
}: UseAutoDedupOptions): UseAutoDedupReturn {
  const [phase, setPhase] = useState<Phase>("running");
  const [stats, setStats] = useState<Stats>({
    scanned: 0,
    duplicatesFound: 0,
    actioned: 0,
    errors: 0,
    retrying: 0,
  });
  const [rows, setRows] = useState<PageRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pageMapRef = useRef<Map<string, PageRow>>(new Map());
  const pendingBufferRef = useRef<PageRow[] | null>(dryRun ? [] : null);
  const allLogsRef = useRef<LogEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const batchDirtyRef = useRef(false);
  const logsDirtyRef = useRef(false);
  const statsDirtyRef = useRef(false);
  const statsFlushRef = useRef<Stats>({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 });
  // Generation counter: incremented on each start() so stale pipeline runs ignore their own output.
  const runGenRef = useRef(0);

  // Re-sort pageMapRef values and push to rows state.
  // Sort: non-empty fieldValues alphabetically, empty sinks to bottom.
  // Within same fieldValue: by STATUS_ORDER (kept first, errors last).
  const flushRows = useCallback(() => {
    const sorted = Array.from(pageMapRef.current.values()).sort((a, b) => {
      const aEmpty = a.fieldValue === "(empty)";
      const bEmpty = b.fieldValue === "(empty)";
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      const fv = a.fieldValue < b.fieldValue ? -1 : a.fieldValue > b.fieldValue ? 1 : 0;
      if (fv !== 0) return fv;
      return (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    });
    setRows(sorted);
  }, []);

  // 300ms batch flush — decouples render frequency from pipeline speed.
  useEffect(() => {
    const interval = setInterval(() => {
      if (batchDirtyRef.current) {
        flushRows();
        batchDirtyRef.current = false;
      }
      if (logsDirtyRef.current) {
        setLogs(allLogsRef.current.slice(-LOG_DISPLAY_LIMIT).reverse());
        logsDirtyRef.current = false;
      }
      if (statsDirtyRef.current) {
        setStats({ ...statsFlushRef.current });
        statsDirtyRef.current = false;
      }
    }, 300);
    return () => clearInterval(interval);
  }, [flushRows]);

  const runPipeline = useCallback(async () => {
    // ── Shared pipeline state (plain arrays; safe without locks — JS is single-threaded) ──
    const fetchQueue: MinimalPage[] = [];
    const deleteQueue: DeleteTask[] = [];
    const retryQueue: DeleteTask[] = [];   // pages that failed first deletion attempt
    let fetchDone = false;
    let fetchError: Error | null = null;
    let matchDone = false;
    const seenMap = new Map<string, { id: string; created_time: string; title: string }>();

    const startTime = startTimeRef.current;

    const appendLog = (raw: Record<string, unknown>, level: LogEntry["level"], message: string) => {
      const absTs = Date.now();
      allLogsRef.current.push({
        ts: absTs - startTime,
        absTs,
        type: raw.type as string,
        level,
        message,
        raw,
      });
      logsDirtyRef.current = true;
    };

    const addToStats = (delta: Partial<Stats>) => {
      statsFlushRef.current = {
        scanned: statsFlushRef.current.scanned + (delta.scanned ?? 0),
        duplicatesFound: statsFlushRef.current.duplicatesFound + (delta.duplicatesFound ?? 0),
        actioned: statsFlushRef.current.actioned + (delta.actioned ?? 0),
        errors: statsFlushRef.current.errors + (delta.errors ?? 0),
        retrying: statsFlushRef.current.retrying + (delta.retrying ?? 0),
      };
      statsDirtyRef.current = true;
    };

    // Route a page row to the right destination:
    // - dryRun: pending rows go to pendingBufferRef (revealed atomically on done); others ignored
    // - normal: all rows go directly into pageMapRef for immediate display
    const emitPage = (row: PageRow) => {
      if (dryRun && pendingBufferRef.current !== null) {
        if (row.status === "pending") {
          pendingBufferRef.current.push(row);
        }
        // kept/skipped/error are irrelevant in dryRun preview mode
      } else {
        pageMapRef.current.set(row.id, row);
        batchDirtyRef.current = true;
      }
    };

    try {
      // Fetch schema once before kicking off workers — provides fieldType and titlePropName.
      const schema = await getDatabaseSchema(databaseId, token);
      const propertyTypeMap = Object.fromEntries(schema.map((p) => [p.name, p.type]));
      const fieldType = propertyTypeMap[fieldName];
      const titlePropName = schema.find((p) => p.type === "title")?.name;

      if (!fieldType) {
        appendLog({ type: "error" }, "error", `Field "${fieldName}" not found in schema`);
        setPhase("error");
        return;
      }

      // ── Stage 1: fetchWorker ──────────────────────────────────────────────────
      const fetchWorker = async () => {
        try {
          appendLog({ type: "stage", stage: "fetch" }, "info", "Fetching pages from Notion...");
          let batchNum = 0;
          for await (const batch of paginateDatabase(databaseId, token)) {
            if (cancelledRef.current) return;
            batchNum++;
            appendLog(
              { type: "notionAPI" },
              "info",
              `Fetching batch ${batchNum} (${batch.length} pages)`
            );
            for (const rawPage of batch) {
              if (cancelledRef.current) return;
              let title = "(Untitled)";
              if (titlePropName) {
                const titleProp = (rawPage as RawNotionPage).properties[titlePropName];
                if (titleProp && "title" in titleProp) {
                  title = titleProp.title?.[0]?.plain_text ?? "(Untitled)";
                }
              }
              const fieldProp = (rawPage as RawNotionPage).properties[fieldName];
              const fieldValue = fieldProp
                ? (getPropertyValue(fieldProp, fieldType) ?? "(empty)")
                : "(empty)";
              fetchQueue.push({
                id: rawPage.id,
                created_time: rawPage.created_time,
                title,
                fieldValue,
              });
            }
          }
          appendLog(
            { type: "stage", stage: "fetch" },
            "info",
            `Fetched ${batchNum} batches`
          );
        } catch (err) {
          fetchError = err instanceof Error ? err : new Error(String(err));
        } finally {
          fetchDone = true;
        }
      };

      // ── Stage 2: matchWorker ──────────────────────────────────────────────────
      const matchWorker = async () => {
        try {
          let stageStarted = false;
          while (!fetchDone || fetchQueue.length > 0) {
            if (cancelledRef.current) return;
            if (fetchError) throw fetchError;

            if (fetchQueue.length === 0) {
              await new Promise<void>((r) => setTimeout(r, 5));
              continue;
            }

            if (!stageStarted) {
              appendLog(
                { type: "stage", stage: "match" },
                "info",
                "Scanning for duplicates..."
              );
              stageStarted = true;
            }

            // Pause between pages — never mid-page
            while (pausedRef.current && !cancelledRef.current) {
              await new Promise<void>((r) => setTimeout(r, 100));
            }
            if (cancelledRef.current) return;

            const { id, created_time, title, fieldValue } = fetchQueue.shift()!;

            if (skipEmpty && (fieldValue === "(empty)" || fieldValue === null)) {
              emitPage({ id, title, fieldValue, status: "skipped" });
              addToStats({ scanned: 1 });
              const s = statsFlushRef.current;
              appendLog(
                { type: "progress", ...s },
                "info",
                `progress — scanned: ${s.scanned}, dupes: ${s.duplicatesFound}, actioned: ${s.actioned}, errors: ${s.errors}`
              );
              continue;
            }

            const existing = seenMap.get(fieldValue);
            let isDuplicate = false;
            if (!existing) {
              seenMap.set(fieldValue, { id, created_time, title });
              emitPage({ id, title, fieldValue, status: "kept" });
            } else {
              isDuplicate = true;
              const thisTime = new Date(created_time).getTime();
              const existingTime = new Date(existing.created_time).getTime();
              let taskId: string;
              let taskTitle: string;
              if (thisTime < existingTime) {
                // This page is older — promote it to kept, queue the previously-kept page
                taskId = existing.id;
                taskTitle = existing.title;
                seenMap.set(fieldValue, { id, created_time, title });
                emitPage({ id, title, fieldValue, status: "kept" });
              } else {
                // Existing is older — queue this page
                taskId = id;
                taskTitle = title;
              }
              deleteQueue.push({ id: taskId, title: taskTitle, fieldValue });
            }

            addToStats({ scanned: 1, ...(isDuplicate && { duplicatesFound: 1 }) });
            const s = statsFlushRef.current;
            appendLog(
              { type: "progress", ...s },
              "info",
              `progress — scanned: ${s.scanned}, dupes: ${s.duplicatesFound}, actioned: ${s.actioned}, errors: ${s.errors}`
            );
          }
        } finally {
          matchDone = true;
        }
      };

      // ── Stage 3a: deleteWorker (real run, first attempt) ──────────────────────
      // On failure: push to retryQueue and mark page as "retry"; permanent errors happen in Stage 3b.
      const createDeleteWorker = (workerId: number) => async () => {
        let stageStarted = false;
        while (!matchDone || deleteQueue.length > 0) {
          if (cancelledRef.current) return;
          if (deleteQueue.length === 0) {
            await new Promise<void>((r) => setTimeout(r, 5));
            continue;
          }
          if (!stageStarted) {
            appendLog(
              { type: "stage", stage: "delete" },
              "info",
              `[Worker ${workerId}/3] Starting ${mode}...`
            );
            stageStarted = true;
          }
          const task = deleteQueue.shift()!;
          const { id: pageId, title, fieldValue } = task;
          try {
            const action = mode === "archive" ? "Archiving" : "Deleting";
            appendLog(
              { type: "notionAPI" },
              "info",
              `[Worker ${workerId}/3] ${action} page: "${title}"`
            );
            if (mode === "archive") {
              await archivePage(pageId, token);
            } else {
              await deletePage(pageId, token);
            }
            addToStats({ actioned: 1 });
            const actionedStatus = mode === "archive" ? "archived" : "deleted";
            emitPage({ id: pageId, title, fieldValue, status: actionedStatus as PageRow["status"] });
            const s = statsFlushRef.current;
            appendLog(
              { type: "actioned", pageId, title, fieldValue, ...s },
              "info",
              `[${pageId.slice(0, 8)}] ${actionedStatus.toUpperCase()} "${title}" — ${fieldName}: ${fieldValue}`
            );
          } catch (err) {
            // First attempt failed — queue for one retry instead of immediately erroring.
            retryQueue.push(task);
            addToStats({ retrying: 1 });
            emitPage({ id: pageId, title, fieldValue, status: "retry" });
            appendLog(
              { type: "actionError", pageId, title, error: err instanceof Error ? err.message : "Unknown" },
              "warn",
              `[${pageId.slice(0, 8)}] FAILED (will retry) to ${mode} "${title}": ${err instanceof Error ? err.message : "Unknown"}`
            );
          }
        }
      };

      // ── Stage 3b: retryWorker (second attempt; runs after all deleteWorkers finish) ──
      // On failure: mark permanently as "error" with no further retries.
      const createRetryWorker = (workerId: number) => async () => {
        if (retryQueue.length === 0) return;
        appendLog(
          { type: "stage", stage: "retry" },
          "info",
          `[Retry Worker ${workerId}/3] Processing ${retryQueue.length} items in retry queue...`
        );
        while (retryQueue.length > 0) {
          if (cancelledRef.current) return;
          const { id: pageId, title, fieldValue } = retryQueue.shift()!;
          addToStats({ retrying: -1 });
          try {
            if (mode === "archive") {
              await archivePage(pageId, token);
            } else {
              await deletePage(pageId, token);
            }
            addToStats({ actioned: 1 });
            const actionedStatus = mode === "archive" ? "archived" : "deleted";
            emitPage({ id: pageId, title, fieldValue, status: actionedStatus as PageRow["status"] });
            const s = statsFlushRef.current;
            appendLog(
              { type: "actioned", pageId, title, fieldValue, ...s },
              "info",
              `[Retry] ${actionedStatus.toUpperCase()} "${title}" — ${fieldName}: ${fieldValue}`
            );
          } catch (err) {
            addToStats({ errors: 1 });
            emitPage({ id: pageId, title, fieldValue, status: "error" });
            appendLog(
              { type: "actionError", pageId, title, error: err instanceof Error ? err.message : "Unknown" },
              "error",
              `[Retry][${pageId.slice(0, 8)}] PERMANENT FAILURE — ${mode} "${title}": ${err instanceof Error ? err.message : "Unknown"}. Delete manually in Notion.`
            );
          }
        }
      };

      // ── Stage 3b: drainWorker (dry-run) ───────────────────────────────────────
      const createDrainWorker = (workerId: number) => async () => {
        let stageStarted = false;
        while (!matchDone || deleteQueue.length > 0) {
          if (cancelledRef.current) return;
          if (deleteQueue.length === 0) {
            await new Promise<void>((r) => setTimeout(r, 5));
            continue;
          }
          if (!stageStarted) {
            appendLog(
              { type: "stage", stage: "preview" },
              "info",
              `[Worker ${workerId}/3] Ready (dry-run mode)`
            );
            stageStarted = true;
          }
          const { id: pageId, title, fieldValue } = deleteQueue.shift()!;
          emitPage({ id: pageId, title, fieldValue, status: "pending" });
          appendLog(
            { type: "page", id: pageId, title, fieldValue, status: "pending" },
            "warn",
            `[${pageId.slice(0, 8)}] WOULD ${mode.toUpperCase()} "${title}" — ${fieldName}: ${fieldValue}`
          );
        }
      };

      // ── Orchestrate all workers ───────────────────────────────────────────────
      // Phase 1: fetch + match + first-attempt deletes (or preview drains) run concurrently.
      // Phase 2: retry workers run only after Phase 1 finishes, so retryQueue is fully populated.
      if (!dryRun) {
        await Promise.all([
          fetchWorker(),
          matchWorker(),
          createDeleteWorker(1)(),
          createDeleteWorker(2)(),
          createDeleteWorker(3)(),
        ]);
        if (!cancelledRef.current && retryQueue.length > 0) {
          appendLog(
            { type: "stage", stage: "retry" },
            "info",
            `Starting retry phase for ${retryQueue.length} item(s)...`
          );
          await Promise.all([
            createRetryWorker(1)(),
            createRetryWorker(2)(),
            createRetryWorker(3)(),
          ]);
        }
      } else {
        await Promise.all([
          fetchWorker(),
          matchWorker(),
          createDrainWorker(1)(),
          createDrainWorker(2)(),
          createDrainWorker(3)(),
        ]);
      }

      if (cancelledRef.current) return;

      // dryRun: reveal all buffered pending rows atomically on completion
      if (dryRun && pendingBufferRef.current !== null) {
        for (const row of pendingBufferRef.current) {
          pageMapRef.current.set(row.id, row);
        }
        pendingBufferRef.current = null;
        flushRows();
      }

      const s = statsFlushRef.current;
      const errorSuffix = s.errors > 0 ? `, ${s.errors} permanently failed (delete manually in Notion)` : "";
      appendLog(
        { type: "done", ...s },
        s.errors > 0 ? "warn" : "info",
        `DONE — ${s.scanned} scanned, ${s.duplicatesFound} duplicates found, ${s.actioned} ${mode}d${errorSuffix}`
      );
      setStats({ ...s });
      setPhase(dryRun ? "preview" : "done");
    } catch (err) {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        allLogsRef.current.push({
          ts: Date.now() - startTime,
          absTs: Date.now(),
          type: "error",
          level: "error",
          message: `FATAL ERROR — ${msg}`,
          raw: { type: "error" },
        });
        logsDirtyRef.current = true;
        setPhase("error");
      }
    }
  }, [databaseId, fieldName, token, mode, skipEmpty, dryRun, flushRows]);

  const start = useCallback(() => {
    cancelledRef.current = false;
    pausedRef.current = false;
    pageMapRef.current = new Map();
    pendingBufferRef.current = dryRun ? [] : null;
    allLogsRef.current = [
      {
        ts: 0,
        absTs: Date.now(),
        type: "start",
        level: "info",
        message: "Process started",
        raw: { type: "start" },
      },
    ];
    startTimeRef.current = Date.now();
    batchDirtyRef.current = false;
    logsDirtyRef.current = false;
    statsDirtyRef.current = false;
    statsFlushRef.current = { scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 };
    setStats({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 });
    setRows([]);
    setLogs([...allLogsRef.current]);
    setPhase("running");
    runPipeline();
  }, [dryRun, runPipeline]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPhase("running");
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    setPhase("done");
  }, []);

  return { phase, stats, rows, logs, allLogsRef, start, pause, resume, stop };
}
