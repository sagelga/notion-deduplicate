// storage.ts
//
// Centralized localStorage utilities and key constants. Using StorageKeys
// ensures no key collisions across features and makes it easy to find all
// localStorage usage by searching for the constant namespace.
//
// All localStorage access is wrapped in try/catch so the app degrades
// gracefully when storage is unavailable (e.g., private browsing mode).

import { DEFAULT_WINDOW_DAYS } from "./constants";

// ── Key definitions ───────────────────────────────────────────────────────────

export const StorageKeys = {
  agenda: {
    databaseId: "agenda:databaseId",
    databaseName: "agenda:databaseName",
    showDone: "agenda:showDone",
    defaultView: "agenda:defaultView",
    calendarStartDay: "agenda:calendarStartDay",
    calendarDefaultMode: "agenda:calendarDefaultMode",
    dateFormat: "agenda:dateFormat",
    quickAddDefaultPriority: "agenda:quickAddDefaultPriority",
    quickAddDefaultLabels: "agenda:quickAddDefaultLabels",
    windowDays: "agenda:windowDays",
    propertyMapping: "agenda:propertyMapping",
    tasksCache: "agenda:tasksCache",
    inboxCache: "agenda:inboxCache",
  },
  dedup: {
    state: "dedup:state",
  },
  notion: {
    cache: "notion:cache",
    schema: "notion:schema",
  },
  notionToken: "notion:token",
} as const;

// ── Generic localStorage helpers ─────────────────────────────────────────────

/** Read a JSON value from localStorage. Returns null on failure or missing key. */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Write a JSON value to localStorage. Silently fails if storage is unavailable. */
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage full or unavailable — graceful degradation */
  }
}

/** Read a string from localStorage. Returns null on failure or missing key. */
export function getString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a string to localStorage. Silently fails if storage is unavailable. */
export function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage full or unavailable — graceful degradation */
  }
}

// ── Agenda-specific helpers ───────────────────────────────────────────────────

/** Load the tasks cache from localStorage. Caller is responsible for casting to the correct type. */
export function loadTasksCache(): Array<Record<string, unknown>> {
  return getItem<Array<Record<string, unknown>>>(StorageKeys.agenda.tasksCache) ?? [];
}

/** Save the tasks cache to localStorage. */
export function saveTasksCache(cache: Array<Record<string, unknown>>): void {
  setItem(StorageKeys.agenda.tasksCache, cache);
}

/** Load the inbox cache from localStorage. Caller is responsible for casting to the correct type. */
export function loadInboxCache(): Array<Record<string, unknown>> {
  return getItem<Array<Record<string, unknown>>>(StorageKeys.agenda.inboxCache) ?? [];
}

/** Save the inbox cache to localStorage. */
export function saveInboxCache(cache: Array<Record<string, unknown>>): void {
  setItem(StorageKeys.agenda.inboxCache, cache);
}

export function getWindowDays(): number {
  const raw = localStorage.getItem(StorageKeys.agenda.windowDays);
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return DEFAULT_WINDOW_DAYS;
}