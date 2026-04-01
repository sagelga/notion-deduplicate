/**
 * Shared Notion API helpers
 */

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

export interface NotionPage {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

export function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

export function getPropertyValue(
  prop: any,
  propType: string
): string | null {
  if (!prop) return null;

  try {
    switch (propType) {
      case "title":
        return prop.title?.[0]?.plain_text ?? null;
      case "rich_text":
        return prop.rich_text?.[0]?.plain_text ?? null;
      case "select":
        return prop.select?.name ?? null;
      case "number":
        return prop.number !== null ? String(prop.number) : null;
      case "email":
        return prop.email ?? null;
      case "url":
        return prop.url ?? null;
      case "phone_number":
        return prop.phone_number ?? null;
      case "checkbox":
        return String(prop.checkbox ?? false);
      case "date":
        return prop.date?.start ?? null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export async function* paginateDatabase(
  databaseId: string,
  token: string
): AsyncGenerator<NotionPage[]> {
  const headers = notionHeaders(token);
  let startCursor: string | undefined;

  while (true) {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_size: 100,
          start_cursor: startCursor,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch database: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const pages: NotionPage[] = data.results || [];

    if (pages.length > 0) {
      yield pages;
    }

    // Check if there are more pages
    if (!data.has_more) {
      break;
    }

    startCursor = data.next_cursor;
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
    const propObj = prop as any;
    properties.push({
      id: propObj.id,
      name,
      type: propObj.type,
    });
  }

  return properties;
}

export async function listDatabases(token: string): Promise<any[]> {
  const headers = notionHeaders(token);
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      filter: {
        value: "database",
        property: "object",
      },
      page_size: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to list databases: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

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
