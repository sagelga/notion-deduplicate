import { cookies } from "next/headers";
import { deletePage } from "@/lib/notion";

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

    const { pageIds } = await request.json() as { pageIds: string[] };

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid pageIds array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const details: Array<{ id: string; ok: boolean; error?: string }> = [];
    let deleted = 0;
    let errors = 0;

    // Delete pages sequentially
    for (const pageId of pageIds) {
      try {
        await deletePage(pageId, notionToken);
        details.push({ id: pageId, ok: true });
        deleted++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        details.push({ id: pageId, ok: false, error: errorMessage });
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        deleted,
        errors,
        details,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deduplicating pages:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to deduplicate pages",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
