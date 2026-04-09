import { cookies } from "next/headers";
import { getDatabaseSchema, getPropertyValue, paginateDatabase } from "@/lib/notion";

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: databaseId } = await params;
  const url = new URL(request.url);
  const fieldsParam = url.searchParams.get("fields");
  const requestedFields = fieldsParam ? new Set(fieldsParam.split(",")) : null;

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
        const titlePropName = schema.find((p) => p.type === "title")?.name;

        send({ type: "schema", propertyTypeMap });

        let total = 0;

        for await (const batch of paginateDatabase(databaseId, notionToken)) {
          const pages = batch.map((page) => {
            let title = "(Untitled)";
            if (titlePropName) {
              const titleProp = page.properties[titlePropName];
              if (titleProp && "title" in titleProp) {
                title = titleProp.title?.[0]?.plain_text ?? "(Untitled)";
              }
            }

            const properties: Record<string, string | null> = {};
            for (const [propName, propValue] of Object.entries(
              page.properties || {}
            )) {
              if (requestedFields && !requestedFields.has(propName)) continue;
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
