// notion.ts
//
// Central module for all Notion API calls. Every function here communicates
// with the Notion REST API — all requests are routed through /api/notion-proxy
// to work around Notion's CORS restriction for integration tokens (secret_...).
//
// Key responsibilities:
//  - Type definitions for raw Notion API shapes (NotionPropertyValue, etc.)
//  - Header construction (notionHeaders) — used by the proxy route server-side
//  - Extracting scalar values from the polymorphic property shape (getPropertyValue)
//  - Paginated database querying with read-ahead prefetch + adaptive rate limiting
//    (paginateDatabase)
//  - Database schema introspection (getDatabaseSchema)
//  - Workspace database discovery (listDatabases)
//  - Single-page mutation: soft-delete via archive, hard-delete via block DELETE
//
// Rate limiting (Notion allows ~3 req/s per integration):
//  - All fetch calls go through fetchWithRetry, which handles 429 responses by
//    respecting the Retry-After header forwarded from the proxy (or falling back
//    to exponential back-off).
//  - paginateDatabase adds an adaptive inter-request delay that starts at 0 and
//    increases when 429s are received, then decays back toward 0 as requests
//    succeed — automatic slowdown/speedup with no manual tuning required.
//
// Caching:
//  - getDatabaseSchema results are cached in NotionCache (15 min TTL).
//  - paginateDatabase does NOT cache at this level — caching is done by callers
//    (useAgendaSync, useAutoDeduplicate) since they decide filter/sort strategy.

import { NotionCache } from "./cache";
import { MAX_RETRY_WAIT_MS, RATE_LIMIT_DECAY } from "./constants";

type NotionRichText = { plain_text: string }[];
type NotionSelect = { name: string } | null;
type NotionDate = { start: string } | null;

// NotionPropertyValue mirrors the subset of Notion property types that this
// app actually needs to read. Fields for unsupported types are simply absent.
interface NotionMultiSelectItem {
  name: string;
}

interface NotionPropertyValue {
  title?: NotionRichText;
  rich_text?: NotionRichText;
  select?: NotionSelect;
  multi_select?: NotionMultiSelectItem[];
  number?: number | null;
  email?: string | null;
  url?: string | null;
  phone_number?: string | null;
  checkbox?: boolean;
  date?: NotionDate;
  type?: string;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

// NotionPage is the app's normalised representation — all property values have
// already been extracted to plain strings (or null).
export interface NotionPage {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

// RawNotionPage is what the Notion API actually returns. Properties are still
// in their original polymorphic shape before getPropertyValue normalises them.
export interface RawNotionPage {
  id: string;
  created_time: string;
  properties: Record<string, NotionPropertyValue>;
}

export interface NotionDatabase {
  id: string;
  title: Array<{ plain_text: string }>;
}

export interface NotionFilter {
  property: string;
  date?: {
    equals?: string;
    before?: string;
    after?: string;
    is_empty?: boolean;
    is_not_empty?: boolean;
  };
  select?: {
    equals?: string;
  };
}

export interface NotionSort {
  property: string;
  direction: "ascending" | "descending";
}

// Build the standard headers required by every Notion API request.
// Used by the server-side proxy route (src/app/api/notion-proxy/route.ts);
// client code should call the exported functions below instead.
export function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

// Normalise a single Notion property to a plain string (or null).
// propType must match the Notion API type string for the property so we read
// the correct field from the polymorphic NotionPropertyValue union.
// The try/catch guards against unexpected API shapes — we prefer returning null
// over crashing the dedup pipeline over a single malformed property.
export function getPropertyValue(
  prop: NotionPropertyValue,
  propType: string
): string | null {
  if (!prop) return null;

  try {
    switch (propType) {
      case "title":
        // title is an array of rich-text objects; only the first segment is needed.
        return prop.title?.[0]?.plain_text ?? null;
      case "rich_text":
        return prop.rich_text?.[0]?.plain_text ?? null;
      case "select":
        return prop.select?.name ?? null;
      case "number":
        // Explicit null/undefined check because 0 is a valid, falsy number.
        return prop.number !== null && prop.number !== undefined ? String(prop.number) : null;
      case "email":
        return prop.email ?? null;
      case "url":
        return prop.url ?? null;
      case "phone_number":
        return prop.phone_number ?? null;
      case "checkbox":
        return String(prop.checkbox ?? false);
      case "date":
        // Use the start of the date range; end is ignored for dedup purposes.
        return prop.date?.start ?? null;
      default:
        // Unsupported types (relation, formula, rollup, etc.) cannot be used
        // as dedup keys — the UI should prevent selecting them, but we return
        // null defensively here.
        return null;
    }
  } catch {
    return null;
  }
}

// Pause execution for `ms` milliseconds.
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Route a Notion API call through the server proxy to avoid CORS restrictions.
// path must start with "/v1/". The token is included in the encrypted body.
function notionProxyFetch(
  path: string,
  method: string,
  token: string,
  body?: unknown
): Promise<Response> {
  return fetch("/api/notion-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, method, token, ...(body !== undefined ? { body } : {}) }),
  });
}

// Fetch with automatic retry for rate-limit (429) and transient (5xx) errors.
//
// 429 — Too Many Requests:
//   Waits for the number of seconds in the Retry-After response header.
//   Falls back to capped exponential back-off (1s → 2s → 4s … max 64s) when
//   the header is absent. Retries up to maxRetries times before throwing.
//
// 502 / 503 / 504 — Transient gateway errors:
//   Waits with linear back-off (1s, 2s, 3s …). Returns the error response
//   after maxRetries rather than throwing, so callers can inspect the status.
//
// All other non-2xx responses are returned immediately (permanent errors such
// as 401 Unauthorized or 404 Not Found should not be retried).
async function fetchWithRetry(
  path: string,
  method: string,
  token: string,
  body?: unknown,
  maxRetries = 5
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await notionProxyFetch(path, method, token, body);

    if (res.ok) return res;

    if (res.status === 429) {
      if (attempt >= maxRetries) {
        throw new Error(`Notion rate limit exceeded after ${maxRetries} retries (429)`);
      }
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseFloat(retryAfter) * 1000
        : Math.min(1000 * Math.pow(2, attempt), MAX_RETRY_WAIT_MS);
      await sleep(waitMs);
      continue;
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      if (attempt >= maxRetries) return res; // let caller handle the final error response
      await sleep(1000 * (attempt + 1));
      continue;
    }

    // Non-retryable error (401, 400, 404, etc.) — return immediately.
    return res;
  }
  // Unreachable; TypeScript requires a return after the loop.
  throw new Error("Unexpected state in fetchWithRetry");
}

// Async generator that streams pages from a Notion database in batches of 100
// (Notion's maximum page_size). Designed to be consumed by the dedup pipeline's
// fetchWorker, which processes each batch while the generator prefetches the next.
//
// Adaptive rate limiting:
//   adaptiveDelayMs starts at 0 (no delay — full speed).
//   On 429: set to max(current, Retry-After * 1000) so the next request is
//     already slowed down before we even see a second rate-limit error.
//   On success: multiply by 0.75 (25% decay per successful batch), flooring at 0.
//   This means one 429 slows all subsequent batches proportionally; sustained
//   success gradually returns to full speed without manual configuration.
//
// Optional filter/sorts:
//   filter — Notion filter object (property conditions) to narrow results.
//   sorts  — Notion sort array to order results (e.g. by due date).
//   When omitted, pages are returned in creation order (default Notion behaviour).
export async function* paginateDatabase(
  databaseId: string,
  token: string,
  options?: {
    filter?: NotionFilter;
    sorts?: NotionSort[];
  }
): AsyncGenerator<RawNotionPage[]> {
  // Per-session adaptive delay in milliseconds. Mutated by fetchPage callbacks.
  let adaptiveDelayMs = 0;

  type PageResult = { results: RawNotionPage[]; has_more: boolean; next_cursor: string | null };

  const fetchPage = async (cursor: string | undefined): Promise<PageResult> => {
    // Apply adaptive delay accumulated from any previous rate-limit encounters.
    if (adaptiveDelayMs > 0) {
      await sleep(adaptiveDelayMs);
    }

    const body: Record<string, unknown> = {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
      ...(options?.filter ? { filter: options.filter } : {}),
      ...(options?.sorts ? { sorts: options.sorts } : {}),
    };

    for (let attempt = 0; attempt <= 5; attempt++) {
      const res = await notionProxyFetch(
        `/v1/databases/${databaseId}/query`,
        "POST",
        token,
        body
      );

      if (res.ok) {
        // Success: decay adaptive delay toward 0 (gradually speed back up).
        adaptiveDelayMs = Math.floor(adaptiveDelayMs * RATE_LIMIT_DECAY);
        return res.json() as Promise<PageResult>;
      }

      if (res.status === 429) {
        if (attempt >= 5) {
          throw new Error("Notion rate limit exceeded after 5 retries on database query");
        }
        const retryAfter = res.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseFloat(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt), MAX_RETRY_WAIT_MS);
        // Raise adaptive delay so the NEXT batch is proactively slowed too.
        adaptiveDelayMs = Math.max(adaptiveDelayMs, waitMs);
        await sleep(waitMs);
        continue;
      }

      throw new Error(`Failed to fetch database: ${res.status} ${res.statusText}`);
    }
    throw new Error("Unexpected state in fetchPage");
  };

  // Kick off first fetch immediately
  let pending = fetchPage(undefined);

  while (true) {
    const data = await pending;
    const pages: RawNotionPage[] = data.results || [];

    // Prefetch next batch before yielding current batch — overlaps network
    // latency with consumer processing time, eliminating the serial wait.
    if (data.has_more && data.next_cursor) {
      pending = fetchPage(data.next_cursor);
    }

    if (pages.length > 0) {
      yield pages;
    }

    if (!data.has_more) {
      break;
    }
  }
}

export async function getDatabaseSchema(
  databaseId: string,
  token: string
): Promise<NotionProperty[]> {
  const cached = NotionCache.getSchema<NotionProperty[]>(databaseId, "long");
  if (cached) return cached;

  const response = await fetchWithRetry(
    `/v1/databases/${databaseId}`,
    "GET",
    token
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch database schema: ${response.status}`);
  }

  const data = await response.json();
  const properties: NotionProperty[] = [];

  for (const [name, prop] of Object.entries(data.properties || {})) {
    const propObj = prop as { id: string; type: string };
    properties.push({
      id: propObj.id,
      name,
      type: propObj.type,
    });
  }

  NotionCache.setSchema(databaseId, properties);
  return properties;
}

// List all databases the integration token has access to (up to 100).
// Uses the /search endpoint filtered to object type "database".
// Rate-limit and transient errors are handled by fetchWithRetry.
export async function listDatabases(token: string): Promise<NotionDatabase[]> {
  const response = await fetchWithRetry(
    "/v1/search",
    "POST",
    token,
    { filter: { value: "database", property: "object" }, page_size: 100 }
  );

  if (!response.ok) {
    throw new Error(`Failed to list databases: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// Hard-delete a page by deleting its underlying block. This is permanent and
// cannot be undone from the Notion UI. Prefer archivePage for safer operation.
// Note: uses the /blocks endpoint (not /pages) — Notion requires this for deletion.
export async function deletePage(pageId: string, token: string): Promise<void> {
  const response = await fetchWithRetry(
    `/v1/blocks/${pageId}`,
    "DELETE",
    token
  );

  if (!response.ok) {
    throw new Error(`Failed to delete page: ${response.status}`);
  }
}

// Soft-delete a page by setting archived: true. The page moves to Notion's
// trash and can be restored within 30 days. This is the default dedup action
// because it's reversible.
export async function archivePage(pageId: string, token: string): Promise<void> {
  const response = await fetchWithRetry(
    `/v1/pages/${pageId}`,
    "PATCH",
    token,
    { archived: true }
  );

  if (!response.ok) {
    throw new Error(`Failed to archive page: ${response.status}`);
  }
}

// ── Marketplace templates ──────────────────────────────────────────────────

export interface MarketplaceTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  gradient: string;
  featured: boolean;
  trending: boolean;
  href: string;
  author: string | null;
  installCount: number;
  tags: string[];
}

function getMultiSelectValue(prop: NotionPropertyValue): string[] {
  if (!prop?.multi_select) return [];
  return prop.multi_select.map((s) => s.name);
}

export async function listTemplates(
  databaseId: string,
  token: string
): Promise<MarketplaceTemplate[]> {
  const pages: MarketplaceTemplate[] = [];

  for await (const batch of paginateDatabase(databaseId, token)) {
    for (const page of batch) {
      const props = page.properties;
      pages.push({
        id: page.id,
        name: getPropertyValue(props["Name"] ?? props["Title"], "title") ?? "Untitled",
        category: getPropertyValue(props["Category"], "select") ?? "General",
        description: getPropertyValue(props["Description"], "rich_text") ?? "",
        emoji: getPropertyValue(props["Emoji"], "rich_text") ?? "📄",
        gradient: getPropertyValue(props["Gradient"], "rich_text") ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        featured: props["Featured"]?.checkbox ?? false,
        trending: props["Trending"]?.checkbox ?? false,
        href: getPropertyValue(props["NotionTemplateURL"], "url") ?? "#",
        author: getPropertyValue(props["Author"], "rich_text"),
        installCount: parseInt(getPropertyValue(props["InstallCount"], "number") ?? "0", 10),
        tags: getMultiSelectValue(props["Tags"]),
      });
    }
  }

  return pages;
}

export async function getTemplateInstallCount(
  pageId: string,
  token: string
): Promise<number> {
  const response = await notionProxyFetch(`/v1/pages/${pageId}`, "GET", token);

  if (!response.ok) return 0;

  const data = (await response.json()) as { properties?: Record<string, NotionPropertyValue> };
  const prop = data.properties?.["InstallCount"];
  return parseInt(getPropertyValue(prop ?? {}, "number") ?? "0", 10);
}
