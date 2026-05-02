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
import type { Mode, Phase, PageRow, Stats, LogEntry } from "@/components/dedup/dedup-types";
import { LOG_DISPLAY_LIMIT } from "@/components/dedup/dedup-types";
import { MAX_RETRY_WAIT_MS, RATE_LIMIT_DECAY } from "@/lib/constants";
import { NotionCache } from "@/lib/cache";

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

const normalizePageToMinimal = (
  rawPage: RawNotionPage,
  fieldName: string,
  fieldType: string,
  titlePropName: string | undefined
): MinimalPage => {
  let title = "(Untitled)";
  if (titlePropName) {
    const titleProp = rawPage.properties[titlePropName];
    if (titleProp && "title" in titleProp) {
      title = titleProp.title?.[0]?.plain_text ?? "(Untitled)";
    }
  }
  const fieldProp = rawPage.properties[fieldName];
  const fieldValue = fieldProp
    ? (getPropertyValue(fieldProp, fieldType) ?? "(empty)")
    : "(empty)";
  return { id: rawPage.id, created_time: rawPage.created_time, title, fieldValue };
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
  activeStage: string;
  stats: Stats;
  rows: PageRow[];
  /** Display slice: last 500 log entries, reversed (newest first). */
  logs: LogEntry[];
  /** Full unsliced log array — use for export. Ref so callers don't cause re-renders. */
  allLogsRef: React.MutableRefObject<LogEntry[]>;
    start: () => void;
    /** Resets stats to zero and clears all queues. Called by start(). */
    reset: () => void;
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
  const [activeStage, setActiveStage] = useState<string>("");

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

    const elapsed = () => `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

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
      const schema = await getDatabaseSchema(databaseId, token);
      const propertyTypeMap = Object.fromEntries(schema.map((p) => [p.name, p.type]));
      const fieldType = propertyTypeMap[fieldName];
      const titlePropName = schema.find((p) => p.type === "title")?.name;

      if (!fieldType) {
        const available = schema.map((p) => `${p.name} (${p.type})`).join(", ");
        appendLog(
          { type: "error", fieldName, availableFields: schema.map((p) => p.name) },
          "error",
          `Field "${fieldName}" not found in schema. Available fields: ${available}`
        );
        setPhase("error");
        return;
      }

      const cacheKey = `dedup:${databaseId}`;
      const cached = NotionCache.get<RawNotionPage[]>(cacheKey, "short");
      const pagesFromCache: RawNotionPage[] | null = cached ?? null;

      // ── Stage 1: fetchWorker ──────────────────────────────────────────────────
      const fetchWorker = async () => {
        setActiveStage("fetch");
        let pagesProcessed = 0;
        try {
          if (pagesFromCache) {
            appendLog(
              { type: "cache", stage: "fetch", hit: true, count: pagesFromCache.length },
              "info",
              `Cache HIT — loading ${pagesFromCache.length} pages from cache (< 30s old)`
            );
            for (const rawPage of pagesFromCache) {
              if (cancelledRef.current) return;
              fetchQueue.push(normalizePageToMinimal(rawPage, fieldName, fieldType, titlePropName));
              pagesProcessed++;
            }
          } else {
            appendLog(
              { type: "cache", stage: "fetch", hit: false },
              "info",
              `Cache MISS — fetching pages from Notion API (field="${fieldName}")`
            );
            const allRawPages: RawNotionPage[] = [];
            let batchNum = 0;
            let totalPages = 0;
            for await (const batch of paginateDatabase(databaseId, token)) {
              if (cancelledRef.current) return;
              batchNum++;
              totalPages += batch.length;
              appendLog(
                { type: "notionAPI", batch: batchNum, batchSize: batch.length, totalSoFar: totalPages },
                "info",
                `Notion API batch ${batchNum} received — ${batch.length} pages (total: ${totalPages})`
              );
              for (const rawPage of batch) {
                if (cancelledRef.current) return;
                allRawPages.push(rawPage);
                fetchQueue.push(normalizePageToMinimal(rawPage, fieldName, fieldType, titlePropName));
                pagesProcessed++;
              }
            }
            NotionCache.set(cacheKey, allRawPages);
            appendLog(
              { type: "stage", stage: "fetch", batches: batchNum, totalPages: allRawPages.length },
              "info",
              `Fetch complete — ${batchNum} batch(es), ${allRawPages.length} total pages cached`
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          appendLog(
            { type: "error", stage: "fetch", error: msg },
            "error",
            `Fetch FAILED — ${msg}`
          );
          fetchError = err instanceof Error ? err : new Error(msg);
        } finally {
          fetchDone = true;
          if (pagesProcessed > 0) batchDirtyRef.current = true;
          appendLog(
            { type: "stage", stage: "fetch", done: true, pagesProcessed, error: fetchError?.message },
            "info",
            `Stage 1 (fetch) worker finished — ${pagesProcessed} pages, fetchDone=true${fetchError ? `, error: ${fetchError.message}` : ""}`
          );
        }
      };

      // ── Stage 2: matchWorker ──────────────────────────────────────────────────
      const matchWorker = async () => {
        setActiveStage("match");
        let fetchQueueIdx = 0;
        const stats = statsFlushRef.current;
        try {
          let stageStarted = false;
          while (!fetchDone || fetchQueueIdx < fetchQueue.length) {
            if (cancelledRef.current) return;
            if (fetchError) throw fetchError;

            if (fetchQueueIdx >= fetchQueue.length) {
              await new Promise<void>((r) => setTimeout(r, 5));
              continue;
            }

            const queueDepth = fetchQueue.length - fetchQueueIdx;
            if (!stageStarted) {
              appendLog(
                { type: "stage", stage: "match", queueDepth },
                "info",
                `Stage 2 (match) starting — ${queueDepth} pages queued for deduplication`
              );
              stageStarted = true;
            }

            // Pause between pages — never mid-page
            while (pausedRef.current && !cancelledRef.current) {
              await new Promise<void>((r) => setTimeout(r, 100));
            }
            if (cancelledRef.current) return;

            const { id, created_time, title, fieldValue } = fetchQueue[fetchQueueIdx++];

            if (skipEmpty && (fieldValue === "(empty)" || fieldValue === null)) {
              emitPage({ id, title, fieldValue, status: "skipped" });
              addToStats({ scanned: 1 });
              const s = statsFlushRef.current;
              appendLog(
                { type: "skip", pageId: id, title, reason: "empty", fieldValue, ...s },
                "info",
                `SKIP "${title}" [${id.slice(0, 8)}] — ${fieldName} is empty (skipEmpty=true)`
              );
              continue;
            }

            const existing = seenMap.get(fieldValue);
            let isDuplicate = false;
            if (!existing) {
              seenMap.set(fieldValue, { id, created_time, title });
              emitPage({ id, title, fieldValue, status: "kept" });
              appendLog(
                { type: "keep", pageId: id, title, fieldValue, seenCount: seenMap.size, scanned: statsFlushRef.current.scanned + 1 },
                "info",
                `KEPT "${title}" [${id.slice(0, 8)}] — ${fieldName}="${fieldValue}" (${seenMap.size} unique values seen)`
              );
            } else {
              isDuplicate = true;
              const thisTime = new Date(created_time).getTime();
              const existingTime = new Date(existing.created_time).getTime();
              let taskId: string;
              let taskTitle: string;
              let winnerTitle: string;
              let loserTitle: string;
              if (thisTime < existingTime) {
                taskId = existing.id;
                taskTitle = existing.title;
                winnerTitle = title;
                loserTitle = existing.title;
                seenMap.set(fieldValue, { id, created_time, title });
                emitPage({ id, title, fieldValue, status: "kept" });
              } else {
                taskId = id;
                taskTitle = title;
                winnerTitle = existing.title;
                loserTitle = title;
              }
              deleteQueue.push({ id: taskId, title: taskTitle, fieldValue });
              emitPage({ id: taskId, title: taskTitle, fieldValue, status: "pending" });
              const thisAge = new Date(created_time).toISOString();
              const existingAge = new Date(existing.created_time).toISOString();
              appendLog(
                { type: "duplicate", pageId: taskId, title: taskTitle, fieldValue, winnerTitle, loserTitle, thisAge, existingAge, queueDepth: deleteQueue.length },
                "warn",
                `DUPLICATE "${taskTitle}" [${taskId.slice(0, 8)}] — ${fieldName}="${fieldValue}" — QUEUED for ${mode} (kept: "${winnerTitle}" [older], deleted: "${loserTitle}" [newer], deleteQueue=${deleteQueue.length})`
              );
            }

            addToStats({ scanned: 1, ...(isDuplicate && { duplicatesFound: 1 }) });
          }
        } finally {
          matchDone = true;
          const s = statsFlushRef.current;
          appendLog(
            { type: "stage", stage: "match", duration: Date.now() - startTime, ...s },
            "info",
            `Stage 2 (match) DONE — ${s.scanned} scanned, ${s.duplicatesFound} duplicates found, ${deleteQueue.length} queued for ${mode}`
          );
        }
      };

      // ── Stage 3a: deleteWorker (real run, first attempt) ──────────────────────
      // On failure: push to retryQueue and mark page as "retry"; permanent errors happen in Stage 3b.
      const createDeleteWorker = (workerId: number) => async () => {
        setActiveStage("delete");
        let deleteQueueIdx = 0;
        let stageStarted = false;
        while (!matchDone || deleteQueueIdx < deleteQueue.length) {
          if (cancelledRef.current) return;
          if (deleteQueueIdx >= deleteQueue.length) {
            await new Promise<void>((r) => setTimeout(r, 5));
            continue;
          }
          const queueDepth = deleteQueue.length - deleteQueueIdx;
          if (!stageStarted) {
            appendLog(
              { type: "stage", stage: "delete", workerId, queueDepth },
              "info",
              `Stage 3a (delete-${workerId}) starting — ${queueDepth} pages to ${mode}`
            );
            stageStarted = true;
          }
          const task = deleteQueue[deleteQueueIdx++];
          const { id: pageId, title, fieldValue } = task;
          const action = mode === "archive" ? "Archiving" : "Deleting";
          const queueAfter = deleteQueue.length - deleteQueueIdx;
          try {
            appendLog(
              { type: "action", pageId, title, fieldValue, action: mode, workerId, queueBefore: queueAfter + 1, queueAfter },
              "info",
              `[Worker-${workerId}] ${action.toUpperCase()} "${title}" [${pageId.slice(0, 8)}] — ${fieldName}="${fieldValue}" (queue before=${queueAfter + 1}, after=${queueAfter})`
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
              { type: "actioned", pageId, title, fieldValue, actionedStatus, ...s },
              "info",
              `[Worker-${workerId}] ${actionedStatus.toUpperCase()} "${title}" [${pageId.slice(0, 8)}] — ${fieldName}="${fieldValue}" — ${s.actioned}/${s.duplicatesFound} actioned`
            );
          } catch (err) {
            // First attempt failed — queue for one retry instead of immediately erroring.
            retryQueue.push(task);
            addToStats({ retrying: 1 });
            emitPage({ id: pageId, title, fieldValue, status: "retry" });
            appendLog(
              { type: "retryQueued", pageId, title, fieldValue, error: err instanceof Error ? err.message : "Unknown", retryQueueDepth: retryQueue.length + 1 },
              "warn",
              `[Worker-${workerId}] RETRY "${title}" [${pageId.slice(0, 8)}] — ${err instanceof Error ? err.message : "Unknown"} — queued for retry (retryQueue=${retryQueue.length + 1})`
            );
          }
        }
      };

      // ── Stage 3b: retryWorker (second attempt; runs after all deleteWorkers finish) ──
      // On failure: mark permanently as "error" with no further retries.
      const createRetryWorker = (workerId: number) => async () => {
        const retryQueueLength = retryQueue.length;
        if (retryQueueLength === 0) return;
        let retryQueueIdx = 0;
        appendLog(
          { type: "stage", stage: "retry", workerId, queueDepth: retryQueueLength },
          "info",
          `Stage 3b (retry-${workerId}) starting — ${retryQueueLength} page(s) to retry`
        );
        let retriesAttempted = 0;
        while (retryQueueIdx < retryQueue.length) {
          if (cancelledRef.current) return;
          const { id: pageId, title, fieldValue } = retryQueue[retryQueueIdx++];
          retriesAttempted++;
          addToStats({ retrying: -1 });
          try {
            const action = mode === "archive" ? "Archiving" : "Deleting";
            appendLog(
              { type: "retry", pageId, title, fieldValue, action: mode, attemptNumber: retriesAttempted },
              "info",
              `[Retry-${workerId}] Attempt ${retriesAttempted}: ${action} "${title}" [${pageId.slice(0, 8)}] — ${fieldName}="${fieldValue}"`
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
              { type: "actioned", pageId, title, fieldValue, actionedStatus, ...s },
              "info",
              `[Retry-${workerId}] SUCCEEDED "${title}" [${pageId.slice(0, 8)}] — ${s.actioned}/${s.duplicatesFound} actioned`
            );
          } catch (err) {
            addToStats({ errors: 1 });
            emitPage({ id: pageId, title, fieldValue, status: "error" });
            const msg = err instanceof Error ? err.message : "Unknown";
            appendLog(
              { type: "actionError", pageId, title, fieldValue, error: msg },
              "error",
              `[Retry-${workerId}] PERMANENT FAILURE "${title}" [${pageId.slice(0, 8)}] — ${msg} — MANUALLY DELETE in Notion`
            );
          }
        }
        appendLog(
          { type: "stage", stage: "retry", workerId, retriesAttempted },
          "info",
          `Stage 3b (retry-${workerId}) DONE — ${retriesAttempted} retry attempt(s) completed`
        );
      };

      // ── Stage 3b: drainWorker (dry-run) ───────────────────────────────────────
      const createDrainWorker = (workerId: number) => async () => {
        setActiveStage("preview");
        let drainQueueIdx = 0;
        let stageStarted = false;
        while (!matchDone || drainQueueIdx < deleteQueue.length) {
          if (cancelledRef.current) return;
          if (drainQueueIdx >= deleteQueue.length) {
            await new Promise<void>((r) => setTimeout(r, 5));
            continue;
          }
          const queueDepth = deleteQueue.length - drainQueueIdx;
          if (!stageStarted) {
            appendLog(
              { type: "stage", stage: "preview", workerId, queueDepth },
              "info",
              `Stage 3 (drain-${workerId}) starting — dry-run preview, ${queueDepth} pages would be ${mode}d`
            );
            stageStarted = true;
          }
          const { id: pageId, title, fieldValue } = deleteQueue[drainQueueIdx++];
          emitPage({ id: pageId, title, fieldValue, status: "pending" });
          const s = statsFlushRef.current;
          appendLog(
            { type: "preview", pageId, title, fieldValue, action: mode, queueRemaining: deleteQueue.length - drainQueueIdx, ...s },
            "warn",
            `[Drain-${workerId}] WOULD ${mode.toUpperCase()} "${title}" [${pageId.slice(0, 8)}] — ${fieldName}="${fieldValue}" (${deleteQueue.length - drainQueueIdx} remaining)`
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
            { type: "stage", stage: "retry", queueDepth: retryQueue.length },
            "info",
            `Starting Stage 3b (retry phase) — ${retryQueue.length} failed item(s) will be retried`
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
      const duration = Date.now() - startTime;
      const throughput = s.scanned > 0 ? ((s.scanned / duration) * 1000).toFixed(1) : "0";
      const errorSuffix = s.errors > 0 ? `, ${s.errors} permanently failed (must delete manually in Notion)` : "";
      const skippedSuffix = skipEmpty ? ` (skipped empty)` : "";
      const summary = `PIPELINE COMPLETE — ${s.scanned} scanned${skippedSuffix}, ${s.duplicatesFound} duplicates identified, ${s.actioned} ${mode}d (${throughput} pages/sec)${errorSuffix}`;
      appendLog(
        { type: "done", duration, throughput, ...s },
        s.errors > 0 ? "warn" : "info",
        summary
      );
      setStats({ ...s });
      setActiveStage("");
      setPhase(dryRun ? "preview" : "done");
    } catch (err) {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const stack = err instanceof Error ? err.stack : undefined;
        allLogsRef.current.push({
          ts: Date.now() - startTime,
          absTs: Date.now(),
          type: "error",
          level: "error",
          message: `FATAL ERROR — ${msg}`,
          raw: { type: "error", error: msg, stack },
        });
        logsDirtyRef.current = true;
        setPhase("error");
      }
    }
  }, [databaseId, fieldName, token, mode, skipEmpty, dryRun, flushRows]);

  const reset = useCallback(() => {
    pageMapRef.current = new Map();
    pendingBufferRef.current = dryRun ? [] : null;
    allLogsRef.current = [];
    batchDirtyRef.current = false;
    logsDirtyRef.current = false;
    statsDirtyRef.current = false;
    statsFlushRef.current = { scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 };
    setStats({ scanned: 0, duplicatesFound: 0, actioned: 0, errors: 0, retrying: 0 });
    setRows([]);
    setLogs([]);
  }, [dryRun]);

  const start = useCallback(() => {
    cancelledRef.current = false;
    pausedRef.current = false;
    reset();
    startTimeRef.current = Date.now();
    const dbg = databaseId.slice(0, 8);
    allLogsRef.current.push({
      ts: 0,
      absTs: Date.now(),
      type: "start",
      level: "info",
      message: `Starting — db=${dbg}..., field="${fieldName}", mode=${mode}, dryRun=${dryRun}, skipEmpty=${skipEmpty}`,
      raw: { type: "start", databaseId, fieldName, mode, dryRun, skipEmpty },
    });
    setLogs([...allLogsRef.current]);
    setPhase("running");
    runPipeline();
  }, [dryRun, runPipeline, reset, databaseId, fieldName, mode, skipEmpty]);

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
    setActiveStage("");
    setPhase("done");
  }, []);

  return { phase, activeStage, stats, rows, logs, allLogsRef, start, pause, resume, stop, reset };
}
