import { cookies } from "next/headers";
import { archivePage, deletePage } from "@/lib/notion";

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const notionToken = cookieStore.get("notion_token")?.value;

    if (!notionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json() as { pageIds: string[]; mode?: "archive" | "delete" };
    const { pageIds, mode = "archive" } = body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid pageIds array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const details: Array<{ id: string; ok: boolean; error?: string }> = [];
    let actioned = 0;
    let errors = 0;

    for (const pageId of pageIds) {
      try {
        if (mode === "archive") {
          await archivePage(pageId, notionToken);
        } else {
          await deletePage(pageId, notionToken);
        }
        details.push({ id: pageId, ok: true });
        actioned++;
      } catch (error) {
        details.push({
          id: pageId,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ actioned, errors, mode, details }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deduplicating pages:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to deduplicate pages",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
