// agenda-utils.ts
//
// Pure utility functions for normalizing raw Notion pages into AgendaTask objects.
// Kept separate from useAgendaSync so they can be tested in isolation and reused
// across other contexts without depending on React hooks.
//
// The normalization extracts scalar values from the polymorphic Notion property
// shape (NotionPropertyValue) based on a PropertyMapping provided by the caller.

import type { RawNotionPage } from "@/lib/notion";
import type { AgendaTask } from "@/components/agenda/agenda-types";

export interface PropertyMapping {
  title: string;
  done: string | null;
  dueDate: string | null;
  priority: string | null;
  labels: string | null;
  recurring: string | null;
}

export function getTitle(props: Record<string, unknown>, mapping: PropertyMapping): string {
  const val = props[mapping.title] as { type?: string; title?: Array<{ plain_text: string }> } | undefined;
  if (val?.type === "title" && val.title?.[0]) return val.title[0].plain_text;
  return "Untitled";
}

export function getDone(props: Record<string, unknown>, mapping: PropertyMapping): boolean {
  if (!mapping.done) return false;
  const val = props[mapping.done] as { type?: string; checkbox?: boolean } | undefined;
  return val?.type === "checkbox" ? val.checkbox ?? false : false;
}

export function getDueDate(
  props: Record<string, unknown>,
  mapping: PropertyMapping
): { date: string | null; time: string | null } {
  if (!mapping.dueDate) return { date: null, time: null };
  const val = props[mapping.dueDate] as { type?: string; date?: { start?: string } } | undefined;
  if (val?.type === "date" && val.date?.start) {
    const start = val.date.start;
    if (start.includes("T")) {
      const [datePart, timePart] = start.split("T");
      return { date: datePart, time: timePart?.substring(0, 5) ?? null };
    }
    return { date: start, time: null };
  }
  return { date: null, time: null };
}

export function getPriority(props: Record<string, unknown>, mapping: PropertyMapping): "high" | "medium" | "low" | null {
  if (!mapping.priority) return null;
  const val = props[mapping.priority] as { type?: string; select?: { name?: string } } | undefined;
  const name = val?.type === "select" ? val.select?.name : null;
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower === "high" || lower === "urgent") return "high";
  if (lower === "medium" || lower === "normal") return "medium";
  if (lower === "low") return "low";
  return null;
}

export function getLabels(props: Record<string, unknown>, mapping: PropertyMapping): string[] {
  if (!mapping.labels) return [];
  const val = props[mapping.labels] as { type?: string; multi_select?: Array<{ name: string }> } | undefined;
  if (val?.type === "multi_select" && Array.isArray(val.multi_select)) {
    return val.multi_select.map((s) => s.name).filter(Boolean);
  }
  return [];
}

export function getRecurring(props: Record<string, unknown>, mapping: PropertyMapping): string | null {
  if (!mapping.recurring) return null;
  const val = props[mapping.recurring] as { type?: string; rich_text?: Array<{ plain_text: string }> } | undefined;
  if (val?.type === "rich_text" && val.rich_text?.[0]) {
    return val.rich_text[0].plain_text || null;
  }
  return null;
}

export function normalizeTask(page: RawNotionPage, mapping: PropertyMapping): AgendaTask {
  const props = page.properties as Record<string, unknown>;
  const { date, time } = getDueDate(props, mapping);

  return {
    id: page.id,
    title: getTitle(props, mapping),
    done: getDone(props, mapping),
    dueDate: date,
    dueTime: time,
    priority: getPriority(props, mapping),
    labels: getLabels(props, mapping),
    recurring: getRecurring(props, mapping),
    createdTime: page.created_time,
    url: `https://notion.so/${page.id.replace(/-/g, "")}`,
    rawProperties: props,
  };
}