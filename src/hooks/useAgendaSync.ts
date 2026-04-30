// useAgendaSync.ts
//
// Hook for syncing tasks from a Notion database into the Agenda state.
// Uses progressive fetching: each view has its own date window, and tasks
// are merged into a shared cache keyed by databaseId. Switching views only
// fetches newly needed ranges — already-fetched windows are served from cache.

"use client";

import { useCallback, useRef } from "react";
import { useNotionToken } from "./useNotionToken";
import { useAgenda } from "./AgendaContext";
import { paginateDatabase, getDatabaseSchema, NotionFilter, NotionSort } from "@/lib/notion";
import type { RawNotionPage, NotionProperty } from "@/lib/notion";
import type { AgendaTask } from "@/components/agenda/agenda-types";
import type { AgendaView } from "@/components/agenda/agenda-types";
import { NotionCache } from "@/lib/cache";

const LS_WINDOW_DAYS = "agenda:windowDays";
const DEFAULT_WINDOW_DAYS = 14;

export interface PropertyMapping {
  title: string;
  done: string | null;
  dueDate: string | null;
  priority: string | null;
  labels: string | null;
  recurring: string | null;
}

const LS_PROP_MAP = "agenda:propertyMapping";

function loadSavedPropertyMapping(): PropertyMapping | null {
  try {
    const raw = localStorage.getItem(LS_PROP_MAP);
    if (raw) return JSON.parse(raw) as PropertyMapping;
  } catch { /* ignore */ }
  return null;
}

function loadWindowDays(): number {
  try {
    const raw = localStorage.getItem(LS_WINDOW_DAYS);
    if (raw) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return DEFAULT_WINDOW_DAYS;
}

const VIEW_WINDOWS: Record<AgendaView, number> = {
  today: 3,
  upcoming: 7,
  calendar: 45,
  inbox: 0,
};

function buildDateFilter(propertyName: string, before: string, after: string): NotionFilter {
  return {
    property: propertyName,
    date: {
      before,
      after,
    },
  };
}

function buildDateSort(propertyName: string): NotionSort {
  return { property: propertyName, direction: "ascending" };
}

function buildInboxFilter(propertyName: string): NotionFilter {
  return {
    property: propertyName,
    date: {
      is_empty: true,
    },
  };
}

function dateRange(windowDays: number): { start: string; end: string } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - windowDays);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + windowDays);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(startDate), end: fmt(endDate) };
}

function detectPropertyMapping(schema: NotionProperty[]): PropertyMapping {
  const lowerMap = new Map<string, NotionProperty>();
  for (const prop of schema) {
    lowerMap.set(prop.name.toLowerCase(), prop);
  }

  const find = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const found = lowerMap.get(c.toLowerCase());
      if (found) return found.name;
    }
    return null;
  };

  const titleProp = schema.find((p) => p.type === "title");

  return {
    title: titleProp?.name ?? "Name",
    done: find(["done", "completed", "check", "status"]),
    dueDate: find(["due date", "due", "date", "deadline"]),
    priority: find(["priority", "importance", "urgency"]),
    labels: find(["labels", "tags", "categories", "label"]),
    recurring: find(["recurring", "repeat", "recurrence", "every"]),
  };
}

function normalizeTask(page: RawNotionPage, mapping: PropertyMapping): AgendaTask {
  const props = page.properties;

  const getTitle = (): string => {
    const val = props[mapping.title];
    if (val?.type === "title" && val.title?.[0]) return val.title[0].plain_text;
    return "Untitled";
  };

  const getDone = (): boolean => {
    if (!mapping.done) return false;
    const val = props[mapping.done];
    return val?.type === "checkbox" ? val.checkbox ?? false : false;
  };

  const getDueDate = (): { date: string | null; time: string | null } => {
    if (!mapping.dueDate) return { date: null, time: null };
    const val = props[mapping.dueDate];
    if (val?.type === "date" && val.date?.start) {
      const start = val.date.start;
      if (start.includes("T")) {
        const [datePart, timePart] = start.split("T");
        return { date: datePart, time: timePart?.substring(0, 5) ?? null };
      }
      return { date: start, time: null };
    }
    return { date: null, time: null };
  };

  const getPriority = (): "high" | "medium" | "low" | null => {
    if (!mapping.priority) return null;
    const val = props[mapping.priority];
    const name = val?.type === "select" ? val.select?.name : null;
    if (!name) return null;
    const lower = name.toLowerCase();
    if (lower === "high" || lower === "urgent") return "high";
    if (lower === "medium" || lower === "normal") return "medium";
    if (lower === "low") return "low";
    return null;
  };

  const getLabels = (): string[] => {
    if (!mapping.labels) return [];
    const val = props[mapping.labels] as { type?: string; multi_select?: Array<{ name: string }> };
    if (val?.type === "multi_select" && Array.isArray(val.multi_select)) {
      return val.multi_select.map((s) => s.name).filter(Boolean);
    }
    return [];
  };

  const getRecurring = (): string | null => {
    if (!mapping.recurring) return null;
    const val = props[mapping.recurring];
    if (val?.type === "rich_text" && val.rich_text?.[0]) {
      return val.rich_text[0].plain_text || null;
    }
    return null;
  };

  const { date, time } = getDueDate();

  return {
    id: page.id,
    title: getTitle(),
    done: getDone(),
    dueDate: date,
    dueTime: time,
    priority: getPriority(),
    labels: getLabels(),
    recurring: getRecurring(),
    createdTime: page.created_time,
    url: `https://notion.so/${page.id.replace(/-/g, "")}`,
    rawProperties: props as Record<string, unknown>,
  };
}

const LS_TASKS_CACHE = "agenda:tasksCache";
const LS_INBOX_CACHE = "agenda:inboxCache";

function loadTasksCache(): Map<string, AgendaTask> {
  try {
    const raw = localStorage.getItem(LS_TASKS_CACHE);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as AgendaTask[];
    return new Map(arr.map((t) => [t.id, t]));
  } catch {
    return new Map();
  }
}

function saveTasksCache(cache: Map<string, AgendaTask>): void {
  try {
    localStorage.setItem(LS_TASKS_CACHE, JSON.stringify(Array.from(cache.values())));
  } catch {
    /* ignore */
  }
}

function loadInboxCache(): Map<string, AgendaTask> {
  try {
    const raw = localStorage.getItem(LS_INBOX_CACHE);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as AgendaTask[];
    return new Map(arr.map((t) => [t.id, t]));
  } catch {
    return new Map();
  }
}

function saveInboxCache(cache: Map<string, AgendaTask>): void {
  try {
    localStorage.setItem(LS_INBOX_CACHE, JSON.stringify(Array.from(cache.values())));
  } catch {
    /* ignore */
  }
}

export function useAgendaSync() {
  const { token } = useNotionToken();
  const {
    selectedDatabaseId,
    tasks,
    setTasks,
    setIsLoading,
    setError,
    setLastSyncedAt,
    addNotification,
  } = useAgenda();

  const abortRef = useRef(false);
  const tasksCacheRef = useRef<Map<string, AgendaTask>>(new Map());
  const inboxCacheRef = useRef<Map<string, AgendaTask>>(new Map());
  const fetchedRangeRef = useRef<{ start: string; end: string } | null>(null);
  const windowDaysRef = useRef(loadWindowDays());

  const loadCaches = useCallback(() => {
    tasksCacheRef.current = loadTasksCache();
    inboxCacheRef.current = loadInboxCache();
  }, []);

  const mergeTasks = useCallback(
    (newTasks: AgendaTask[], isInbox = false) => {
      const targetCache = isInbox ? inboxCacheRef.current : tasksCacheRef.current;
      for (const t of newTasks) {
        targetCache.set(t.id, t);
      }
      if (isInbox) {
        saveInboxCache(inboxCacheRef.current);
      } else {
        saveTasksCache(tasksCacheRef.current);
      }
      const merged = isInbox
        ? Array.from(inboxCacheRef.current.values())
        : Array.from(tasksCacheRef.current.values());
      setTasks(merged);
    },
    [setTasks]
  );

  const sync = useCallback(
    async (view?: AgendaView, forceRefresh = false) => {
      const currentView = view ?? "today";

      if (!selectedDatabaseId) {
        setError("No database selected");
        return;
      }

      if (!token) {
        setError("No Notion token found. Please connect your Notion account.");
        addNotification({
          variant: "error",
          title: "Not connected",
          message: "Please connect your Notion account to sync tasks.",
          autoDismissMs: 5000,
        });
        return;
      }

      loadCaches();
      abortRef.current = false;
      setIsLoading(true);
      setError(null);

      try {
        const schema = await getDatabaseSchema(selectedDatabaseId, token);
        const savedMapping = loadSavedPropertyMapping();
        const mapping = savedMapping ?? detectPropertyMapping(schema);
        const windowDays = windowDaysRef.current;

        if (currentView === "inbox") {
          if (!forceRefresh && inboxCacheRef.current.size > 0) {
            setTasks(Array.from(inboxCacheRef.current.values()));
            setLastSyncedAt(new Date().toISOString());
            setIsLoading(false);
            addNotification({
              variant: "success",
              title: "Loaded inbox from cache",
              message: `${inboxCacheRef.current.size} tasks.`,
              autoDismissMs: 2000,
            });
            return;
          }

          abortRef.current = false;
          const allTasks: AgendaTask[] = [];

          const filterOptions = mapping.dueDate
            ? { filter: buildInboxFilter(mapping.dueDate) }
            : undefined;

          for await (const batch of paginateDatabase(selectedDatabaseId, token, filterOptions)) {
            if (abortRef.current) break;
            for (const page of batch) {
              allTasks.push(normalizeTask(page, mapping));
            }
          }

          if (!abortRef.current) {
            mergeTasks(allTasks, true);
            setLastSyncedAt(new Date().toISOString());
            addNotification({
              variant: "success",
              title: "Inbox synced",
              message: `${allTasks.length} tasks.`,
              autoDismissMs: 3000,
            });
          }
          setIsLoading(false);
          return;
        }

        const viewWindow = VIEW_WINDOWS[currentView] ?? windowDays;
        const { start, end } = dateRange(viewWindow);

        const alreadyFetched =
          !forceRefresh &&
          fetchedRangeRef.current !== null &&
          fetchedRangeRef.current.start <= start &&
          fetchedRangeRef.current.end >= end &&
          tasksCacheRef.current.size > 0;

        if (alreadyFetched) {
          setTasks(Array.from(tasksCacheRef.current.values()));
          setLastSyncedAt(new Date().toISOString());
          setIsLoading(false);
          addNotification({
            variant: "success",
            title: "Loaded from cache",
            message: `${tasksCacheRef.current.size} tasks.`,
            autoDismissMs: 2000,
          });
          return;
        }

        const filterOptions =
          mapping.dueDate
            ? {
                filter: buildDateFilter(mapping.dueDate, end, start),
                sorts: [buildDateSort(mapping.dueDate)],
              }
            : undefined;

        const allTasks: AgendaTask[] = [];
        for await (const batch of paginateDatabase(selectedDatabaseId, token, filterOptions)) {
          if (abortRef.current) break;
          for (const page of batch) {
            allTasks.push(normalizeTask(page, mapping));
          }
        }

        if (!abortRef.current) {
          mergeTasks(allTasks, false);
          fetchedRangeRef.current = { start, end };
          setLastSyncedAt(new Date().toISOString());
          addNotification({
            variant: "success",
            title: "Synced",
            message: `${allTasks.length} tasks loaded.`,
            autoDismissMs: 3000,
          });
        }
      } catch (err) {
        if (!abortRef.current) {
          const message = err instanceof Error ? err.message : "Failed to sync tasks";
          setError(message);
          addNotification({
            variant: "error",
            title: "Sync failed",
            message,
            autoDismissMs: 8000,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedDatabaseId,
      token,
      setTasks,
      setIsLoading,
      setError,
      setLastSyncedAt,
      addNotification,
      loadCaches,
      mergeTasks,
    ]
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { sync, cancel };
}
