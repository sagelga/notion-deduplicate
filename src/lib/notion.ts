// notion.ts
//
// Central module for all Notion API calls. Every function here communicates
// directly with the Notion REST API using the user's integration token.
//
// Key responsibilities:
//  - Type definitions for raw Notion API shapes (NotionPropertyValue, etc.)
//  - Header construction (notionHeaders)
//  - Extracting scalar values from the polymorphic property shape (getPropertyValue)
//  - Paginated database querying with read-ahead prefetch (paginateDatabase)
//  - Database schema introspection (getDatabaseSchema)
//  - Workspace database discovery with retry (listDatabases)
//  - Single-page mutation: soft-delete via archive, hard-delete via block DELETE

type NotionRichText = { plain_text: string }[];
type NotionSelect = { name: string } | null;
type NotionDate = { start: string } | null;

// NotionPropertyValue mirrors the subset of Notion property types that this
// app actually needs to read. Fields for unsupported types are simply absent.
interface NotionPropertyValue {
  title?: NotionRichText;
  rich_text?: NotionRichText;
  select?: NotionSelect;
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

// Build the standard headers required by every Notion API request.
// The Notion-Version header pins us to a stable API version so that upstream
// changes don't silently break field shapes.
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

// Async generator that streams pages from a Notion database in batches of 100
// (Notion's maximum page_size). Designed to be consumed by the dedup pipeline's
// fetchWorker, which pushes each batch into fetchQueue while the generator
// overlaps the next network request with the consumer's processing.
export async function* paginateDatabase(
  databaseId: string,
  token: string
): AsyncGenerator<RawNotionPage[]> {
  const headers = notionHeaders(token);

  type PageResult = { results: RawNotionPage[]; has_more: boolean; next_cursor: string | null };

  const fetchPage = (cursor: string | undefined): Promise<PageResult> =>
    fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      // Only include start_cursor when paginating — omitting it entirely on
      // the first request is required by the Notion API.
      body: JSON.stringify({ page_size: 10, ...(cursor ? { start_cursor: cursor } : {}) }),
    }).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch database: ${res.status} ${res.statusText}`);
      return res.json() as Promise<PageResult>;
    });

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
  const headers = notionHeaders(token);
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers,
  });

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

  return properties;
}

// List all databases the integration token has access to (up to 100).
// Uses the /search endpoint filtered to object type "database".
//
// Retries up to 3 times with linear back-off (1s, 2s) for gateway errors
// (502/503/504) which are common on the Notion API during high load.
// Non-gateway errors (e.g. 401 invalid token, 400 bad request) are thrown
// immediately without retrying because retrying won't fix them.
export async function listDatabases(token: string): Promise<NotionDatabase[]> {
  const headers = notionHeaders(token);
  const body = JSON.stringify({
    filter: { value: "database", property: "object" },
    page_size: 100,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    // Wait before retrying: 0ms on first attempt, 1000ms on second, 2000ms on third.
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }

    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers,
      body,
    });

    // Transient gateway errors — worth retrying.
    if (response.status === 504 || response.status === 502 || response.status === 503) {
      lastError = new Error(`Failed to list databases: ${response.status} (attempt ${attempt + 1}/3)`);
      continue;
    }

    // Other non-2xx errors are permanent (auth, not found, etc.) — throw immediately.
    if (!response.ok) {
      throw new Error(`Failed to list databases: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  throw lastError ?? new Error("Failed to list databases after 3 attempts");
}

// Hard-delete a page by deleting its underlying block. This is permanent and
// cannot be undone from the Notion UI. Prefer archivePage for safer operation.
// Note: uses the /blocks endpoint (not /pages) — Notion requires this for deletion.
export async function deletePage(pageId: string, token: string): Promise<void> {
  const headers = notionHeaders(token);
  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete page: ${response.status}`);
  }
}

// Soft-delete a page by setting archived: true. The page moves to Notion's
// trash and can be restored within 30 days. This is the default dedup action
// because it's reversible.
export async function archivePage(pageId: string, token: string): Promise<void> {
  const headers = notionHeaders(token);
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ archived: true }),
  });

  if (!response.ok) {
    throw new Error(`Failed to archive page: ${response.status}`);
  }
}
