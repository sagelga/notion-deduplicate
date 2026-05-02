// /api/marketplace/templates
//
// Returns all templates from the marketplace Notion database.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("notion_token")?.value;
  const databaseId = process.env.MARKETPLACE_DATABASE_ID;

  if (!token) {
    return NextResponse.json({ error: "Not connected to Notion" }, { status: 401 });
  }

  if (!databaseId) {
    return NextResponse.json({ error: "Marketplace not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Notion API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  const templates = (data.results ?? []).map((page: Record<string, unknown>) => {
    const props = page.properties as Record<string, Record<string, unknown>>;
    const getText = (prop: Record<string, unknown> | undefined, key: string): string =>
      (prop?.[key] as Array<{ plain_text: string }>)?.map((r) => r.plain_text).join("") ?? "";

    const title = Array.isArray(props["Name"]?.title)
      ? props["Name"].title.map((r: { plain_text: string }) => r.plain_text).join("")
      : "";

    return {
      id: page.id,
      name: title || "Untitled",
      category: (props["Category"]?.select as { name?: string } | null)?.name ?? "General",
      description: getText(props["Description"], "rich_text"),
      emoji: getText(props["Emoji"], "rich_text") || "📄",
      gradient: getText(props["Gradient"], "rich_text") || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      featured: props["Featured"]?.checkbox ?? false,
      trending: props["Trending"]?.checkbox ?? false,
      href: props["NotionTemplateURL"]?.url ?? "#",
      author: getText(props["Author"], "rich_text") || null,
      installCount: props["InstallCount"]?.number ?? 0,
      tags: (props["Tags"]?.multi_select as Array<{ name: string }>)?.map((t) => t.name) ?? [],
    };
  });

  return NextResponse.json({ templates });
}