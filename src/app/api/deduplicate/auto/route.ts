import { cookies } from "next/headers";
import {
  getDatabaseSchema,
  getPropertyValue,
  paginateDatabase,
  archivePage,
  deletePage,
} from "@/lib/notion";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const databaseId = searchParams.get("databaseId");
  const field = searchParams.get("field");
  const mode = (searchParams.get("mode") ?? "archive") as "archive" | "delete";
  const skipEmpty = searchParams.get("skipEmpty") === "true";

  if (!databaseId || !field) {
    return new Response(JSON.stringify({ error: "Missing databaseId or field" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
      const send = (msg: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));

      try {
        const schema = await getDatabaseSchema(databaseId, notionToken);
        const propertyTypeMap = Object.fromEntries(schema.map((p) => [p.name, p.type]));
        const fieldType = propertyTypeMap[field];

        if (!fieldType) {
          send({ type: "error", message: `Field "${field}" not found in schema` });
          controller.close();
          return;
        }

        // fieldValue -> oldest page seen
        const seenMap = new Map<string, { id: string; created_time: string; title: string }>();
        let scanned = 0;
        let duplicatesFound = 0;
        let actioned = 0;
        let errors = 0;

        for await (const batch of paginateDatabase(databaseId, notionToken)) {
          for (const rawPage of batch) {
            // Extract display title
            let title = "(Untitled)";
            const titleEntry = Object.entries(rawPage.properties || {}).find(
              ([, prop]) => prop.type === "title"
            );
            if (titleEntry) {
              const titleProp = titleEntry[1];
              if (titleProp && "title" in titleProp) {
                title = titleProp.title?.[0]?.plain_text ?? "(Untitled)";
              }
            }

            // Extract the field value we're deduplicating on
            const fieldProp = rawPage.properties[field];
            const fieldValue = fieldProp
              ? (getPropertyValue(fieldProp, fieldType) ?? "(empty)")
              : "(empty)";

            // Skip pages with empty field value when skipEmpty is enabled
            if (skipEmpty && (fieldValue === "(empty)" || fieldValue === null)) {
              send({ type: "page", id: rawPage.id, title, fieldValue, status: "skipped" });
              scanned++;
              continue;
            }

            const existing = seenMap.get(fieldValue);

            if (!existing) {
              seenMap.set(fieldValue, {
                id: rawPage.id,
                created_time: rawPage.created_time,
                title,
              });
              send({ type: "page", id: rawPage.id, title, fieldValue, status: "kept" });
            } else {
              duplicatesFound++;
              const thisTime = new Date(rawPage.created_time).getTime();
              const existingTime = new Date(existing.created_time).getTime();

              let pageIdToRemove: string;
              let titleToRemove: string;

              if (thisTime < existingTime) {
                // This page is older — archive the previously-kept one, keep this
                pageIdToRemove = existing.id;
                titleToRemove = existing.title;
                seenMap.set(fieldValue, {
                  id: rawPage.id,
                  created_time: rawPage.created_time,
                  title,
                });
                send({ type: "page", id: rawPage.id, title, fieldValue, status: "kept" });
              } else {
                // Existing is older — archive this page
                pageIdToRemove = rawPage.id;
                titleToRemove = title;
              }

              try {
                if (mode === "archive") {
                  await archivePage(pageIdToRemove, notionToken);
                } else {
                  await deletePage(pageIdToRemove, notionToken);
                }
                actioned++;
                const actionedStatus = mode === "archive" ? "archived" : "deleted";
                // Update status for the removed page
                send({ type: "page", id: pageIdToRemove, title: titleToRemove, fieldValue, status: actionedStatus });
                send({
                  type: "actioned",
                  pageId: pageIdToRemove,
                  title: titleToRemove,
                  fieldValue,
                  scanned,
                  duplicatesFound,
                  actioned,
                  errors,
                });
              } catch (err) {
                errors++;
                send({ type: "page", id: pageIdToRemove, title: titleToRemove, fieldValue, status: "error" });
                send({
                  type: "actionError",
                  pageId: pageIdToRemove,
                  title: titleToRemove,
                  error: err instanceof Error ? err.message : "Unknown error",
                  scanned,
                  duplicatesFound,
                  actioned,
                  errors,
                });
              }
            }

            scanned++;
          }

          send({ type: "progress", scanned, duplicatesFound, actioned, errors });
        }

        send({ type: "done", scanned, duplicatesFound, actioned, errors });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to auto-deduplicate",
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
