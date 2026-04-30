// cache.ts
//
// Centralized caching layer for Notion API responses.
// Two tiers:
//   1. Memory cache  — lives for the browser tab session (Map)
//   2. localStorage   — persisted, has a TTL (Time To Live)
//
// Cache keys are namespaced to avoid collisions with other app data.

const NS = "notion:cache";
const SCHEMA_NS = "notion:schema";

interface CacheEntry<T> {
  data: T;
  storedAt: number;
}

export type CacheTTL = "short" | "medium" | "long";

const TTL_MS: Record<CacheTTL, number> = {
  short: 30_000,
  medium: 60_000,
  long: 15 * 60_000,
};

function localStorageKey(key: string): string {
  return `${NS}:${key}`;
}

function schemaKey(databaseId: string): string {
  return `${SCHEMA_NS}:${databaseId}`;
}

export const NotionCache = {
  get<T>(key: string, ttl: CacheTTL = "medium"): T | null {
    const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry && !isExpired(memoryEntry.storedAt, ttl)) {
      return memoryEntry.data as T;
    }

    try {
      const raw = localStorage.getItem(localStorageKey(key));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (isExpired(entry.storedAt, ttl)) {
        localStorage.removeItem(localStorageKey(key));
        return null;
      }
      const data = entry.data as T;
      memoryCache.set(key, { data, storedAt: entry.storedAt });
      return data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, storedAt: Date.now() };
    memoryCache.set(key, entry);
    try {
      localStorage.setItem(localStorageKey(key), JSON.stringify(entry));
    } catch {
      /* localStorage full or unavailable — memory cache still works */
    }
  },

  invalidate(key: string): void {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(localStorageKey(key));
    } catch {
      /* ignore */
    }
  },

  invalidateAll(): void {
    memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(NS) || k.startsWith(SCHEMA_NS))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  },

  getSchema<T>(databaseId: string, ttl: CacheTTL = "long"): T | null {
    return NotionCache.get<T>(schemaKey(databaseId), ttl);
  },

  setSchema<T>(databaseId: string, data: T): void {
    NotionCache.set(schemaKey(databaseId), data);
  },

  invalidateSchema(databaseId: string): void {
    NotionCache.invalidate(schemaKey(databaseId));
  },
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function isExpired(storedAt: number, ttl: CacheTTL): boolean {
  return Date.now() - storedAt > TTL_MS[ttl];
}

export function hashFilter(filter: unknown): string {
  return hashString(JSON.stringify(filter ?? {}));
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function cacheKey(databaseId: string, filter?: unknown): string {
  return `${databaseId}:${hashFilter(filter)}`;
}