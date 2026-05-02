// property-mapping.ts
//
// Utilities for auto-detecting the Notion property mapping (which property
// corresponds to title, done, due date, etc.) and for persisting it to localStorage.

import type { NotionProperty } from "@/lib/notion";
import type { PropertyMapping } from "./agenda-utils";

const LS_PROP_MAP = "agenda:propertyMapping";

/**
 * Fuzzy-match a property mapping from a database schema.
 *
 * For each field (title, done, dueDate, priority, labels, recurring), tries a
 * list of candidate names in order and returns the first one found in the schema.
 * Matching is case-insensitive.
 *
 * @param schema - The Notion database property schema
 * @returns A PropertyMapping with null for fields that could not be matched
 */
export function detectPropertyMapping(schema: NotionProperty[]): PropertyMapping {
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

export function loadSavedPropertyMapping(): PropertyMapping | null {
  try {
    const raw = localStorage.getItem(LS_PROP_MAP);
    if (raw) return JSON.parse(raw) as PropertyMapping;
  } catch { /* ignore */ }
  return null;
}

export function savePropertyMapping(mapping: PropertyMapping): void {
  try {
    localStorage.setItem(LS_PROP_MAP, JSON.stringify(mapping));
  } catch { /* ignore */ }
}