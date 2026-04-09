import { cookies } from "next/headers";
import { getDatabaseSchema, getPropertyValue, notionHeaders } from "@/lib/notion";
import type { RawNotionPage } from "@/lib/notion";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: databaseId } = await params;
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token")?.value;

  if (!notionToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const headers = notionHeaders(notionToken);

    // Fetch schema and first 50 pages in parallel
    const [schema, pagesRes] = await Promise.all([
      getDatabaseSchema(databaseId, notionToken),
      fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ page_size: 50 }),
      }),
    ]);

    if (!pagesRes.ok) {
      return Response.json(
        { error: `Failed to fetch pages: ${pagesRes.status}` },
        { status: pagesRes.status }
      );
    }

    const propertyTypeMap = Object.fromEntries(schema.map((p) => [p.name, p.type]));
    const data = await pagesRes.json();
    const rawPages: RawNotionPage[] = data.results ?? [];

    const pages = rawPages.map((page) => {
      let title = "(Untitled)";
      const titleEntry = Object.entries(page.properties || {}).find(
        ([, prop]) => prop.type === "title"
      );
      if (titleEntry) {
        title = titleEntry[1].title?.[0]?.plain_text ?? "(Untitled)";
      }

      const properties: Record<string, string | null> = {};
      for (const [propName, propValue] of Object.entries(page.properties || {})) {
        properties[propName] = getPropertyValue(
          propValue,
          propertyTypeMap[propName] ?? "unknown"
        );
      }

      return { id: page.id, created_time: page.created_time, title, properties };
    });

    return Response.json({ pages, schema, hasMore: data.has_more });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch preview" },
      { status: 500 }
    );
  }
}
