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
import type { AgendaTask } from "@/components/agenda/agenda-types";
import type { AgendaView } from "@/components/agenda/agenda-types";
import { DEFAULT_WINDOW_DAYS } from "@/lib/constants";
import { normalizeTask, detectPropertyMapping, loadSavedPropertyMapping } from "@/lib/agenda-utils";
import {
  loadTasksCache,
  saveTasksCache,
  loadInboxCache,
  saveInboxCache,
  getWindowDays,
} from "@/lib/storage";

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

function loadTasksMap(): Map<string, AgendaTask> {
  const arr = loadTasksCache() as AgendaTask[];
  return new Map(arr.map((t) => [t.id, t]));
}

function loadInboxMap(): Map<string, AgendaTask> {
  const arr = loadInboxCache() as AgendaTask[];
  return new Map(arr.map((t) => [t.id, t]));
}

export function useAgendaSync() {
  const { token } = useNotionToken();
  const {
    selectedDatabaseId,
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
  const windowDaysRef = useRef(getWindowDays());

  const loadCaches = useCallback(() => {
    tasksCacheRef.current = loadTasksMap();
    inboxCacheRef.current = loadInboxMap();
  }, []);

  const mergeTasks = useCallback(
    (newTasks: AgendaTask[], isInbox = false) => {
      const targetCache = isInbox ? inboxCacheRef.current : tasksCacheRef.current;
      for (const t of newTasks) {
        targetCache.set(t.id, t);
      }
      if (isInbox) {
        saveInboxCache(Array.from(inboxCacheRef.current.values()) as unknown as Array<Record<string, unknown>>);
      } else {
        saveTasksCache(Array.from(tasksCacheRef.current.values()) as unknown as Array<Record<string, unknown>>);
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