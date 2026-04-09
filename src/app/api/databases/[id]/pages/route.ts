import { cookies } from "next/headers";
import { getDatabaseSchema, getPropertyValue, paginateDatabase } from "@/lib/notion";

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: databaseId } = await params;
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token")?.value;

  if (!notionToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));

      try {
        const schema = await getDatabaseSchema(databaseId, notionToken);
        const propertyTypeMap = Object.fromEntries(
          schema.map((p) => [p.name, p.type])
        );

        send({ type: "schema", propertyTypeMap });

        let total = 0;

        for await (const batch of paginateDatabase(databaseId, notionToken)) {
          const pages = batch.map((page) => {
            let title = "(Untitled)";
            const titleEntry = Object.entries(page.properties || {}).find(
              ([, prop]) => prop.type === "title"
            );
            if (titleEntry) {
              title = titleEntry[1].title?.[0]?.plain_text ?? "(Untitled)";
            }

            const properties: Record<string, string | null> = {};
            for (const [propName, propValue] of Object.entries(
              page.properties || {}
            )) {
              properties[propName] = getPropertyValue(
                propValue,
                propertyTypeMap[propName] ?? "unknown"
              );
            }

            return {
              id: page.id,
              created_time: page.created_time,
              title,
              properties,
            };
          });

          total += pages.length;
          send({ type: "batch", pages });
        }

        send({ type: "done", total });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Failed to fetch pages",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
