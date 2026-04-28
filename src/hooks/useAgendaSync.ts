// useAgendaSync.ts
//
// Hook for syncing tasks from a Notion database into the Agenda state.

"use client";

import { useCallback, useRef } from "react";
import { useNotionToken } from "./useNotionToken";
import { useAgenda } from "./AgendaContext";
import { paginateDatabase, getDatabaseSchema } from "@/lib/notion";
import type { RawNotionPage, NotionProperty } from "@/lib/notion";
import type { AgendaTask } from "@/components/agenda/agenda-types";

interface PropertyMapping {
  title: string;
  done: string | null;
  dueDate: string | null;
  priority: string | null;
  labels: string | null;
  recurring: string | null;
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

  const sync = useCallback(async () => {
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

    abortRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const schema = await getDatabaseSchema(selectedDatabaseId, token);
      const mapping = detectPropertyMapping(schema);
      const allTasks: AgendaTask[] = [];

      for await (const batch of paginateDatabase(selectedDatabaseId, token)) {
        if (abortRef.current) break;
        for (const page of batch) {
          allTasks.push(normalizeTask(page, mapping));
        }
      }

      if (!abortRef.current) {
        setTasks(allTasks);
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
  }, [
    selectedDatabaseId,
    token,
    setTasks,
    setIsLoading,
    setError,
    setLastSyncedAt,
    addNotification,
  ]);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { sync, cancel };
}
