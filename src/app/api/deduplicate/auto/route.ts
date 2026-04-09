import { cookies } from "next/headers";
import {
  getDatabaseSchema,
  getPropertyValue,
  paginateDatabase,
  archivePage,
  deletePage,
} from "@/lib/notion";

export const runtime = "edge";

type MinimalPage = {
  id: string;
  created_time: string;
  title: string;
  fieldValue: string;
};

type DeleteTask = {
  id: string;
  title: string;
  fieldValue: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const databaseId = searchParams.get("databaseId");
  const field = searchParams.get("field");
  const mode = (searchParams.get("mode") ?? "archive") as "archive" | "delete";
  const skipEmpty = searchParams.get("skipEmpty") === "true";
  const dryRun = searchParams.get("dryRun") === "true";

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
      // Safe send — no-ops if the stream has already been closed
      const send = (msg: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));
        } catch {
          // Stream already closed
        }
      };

      try {
        const schema = await getDatabaseSchema(databaseId, notionToken);
        const propertyTypeMap = Object.fromEntries(schema.map((p) => [p.name, p.type]));
        const fieldType = propertyTypeMap[field];
        const titlePropName = schema.find((p) => p.type === "title")?.name;

        if (!fieldType) {
          send({ type: "error", message: `Field "${field}" not found in schema` });
          controller.close();
          return;
        }

        // Stage 1 → Stage 2 queue (minimal page shapes only)
        const fetchQueue: MinimalPage[] = [];
        let fetchDone = false;
        let fetchError: Error | null = null;

        // Stage 2 → Stage 3 queue (duplicate tasks)
        const deleteQueue: DeleteTask[] = [];
        let matchDone = false;

        // Dedup state
        const seenMap = new Map<string, { id: string; created_time: string; title: string }>();
        let scanned = 0;
        let duplicatesFound = 0;
        let actioned = 0;
        let errors = 0;

        // ── Stage 1: Fetch ────────────────────────────────────────────────────
        // Paginates Notion (100 pages/batch) and strips raw pages to MinimalPage
        // before enqueueing — drops all unused Notion properties from memory.
        const fetchWorker = async () => {
          try {
            for await (const batch of paginateDatabase(databaseId, notionToken)) {
              for (const rawPage of batch) {
                let title = "(Untitled)";
                if (titlePropName) {
                  const titleProp = rawPage.properties[titlePropName];
                  if (titleProp && "title" in titleProp) {
                    title = titleProp.title?.[0]?.plain_text ?? "(Untitled)";
                  }
                }

                const fieldProp = rawPage.properties[field];
                const fieldValue = fieldProp
                  ? (getPropertyValue(fieldProp, fieldType) ?? "(empty)")
                  : "(empty)";

                fetchQueue.push({
                  id: rawPage.id,
                  created_time: rawPage.created_time,
                  title,
                  fieldValue,
                });
              }
            }
          } catch (err) {
            fetchError = err instanceof Error ? err : new Error(String(err));
          } finally {
            fetchDone = true;
          }
        };

        // ── Stage 2: Match ────────────────────────────────────────────────────
        // Drains fetchQueue, performs O(1) seenMap lookup. Kept pages are
        // streamed immediately. Duplicates are pushed to deleteQueue for async
        // deletion — matching never blocks on a Notion API call.
        const matchWorker = async () => {
          try {
            while (!fetchDone || fetchQueue.length > 0) {
              if (fetchError) throw fetchError;

              if (fetchQueue.length === 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, 5));
                continue;
              }

              const { id, created_time, title, fieldValue } = fetchQueue.shift()!;

              if (skipEmpty && (fieldValue === "(empty)" || fieldValue === null)) {
                send({ type: "page", id, title, fieldValue, status: "skipped" });
                scanned++;
                send({ type: "progress", scanned, duplicatesFound, actioned, errors });
                continue;
              }

              const existing = seenMap.get(fieldValue);

              if (!existing) {
                seenMap.set(fieldValue, { id, created_time, title });
                send({ type: "page", id, title, fieldValue, status: "kept" });
              } else {
                duplicatesFound++;
                const thisTime = new Date(created_time).getTime();
                const existingTime = new Date(existing.created_time).getTime();

                let taskId: string;
                let taskTitle: string;

                if (thisTime < existingTime) {
                  // This page is older — replace kept entry, queue old one for deletion
                  taskId = existing.id;
                  taskTitle = existing.title;
                  seenMap.set(fieldValue, { id, created_time, title });
                  send({ type: "page", id, title, fieldValue, status: "kept" });
                } else {
                  // Existing is older — queue this page for deletion
                  taskId = id;
                  taskTitle = title;
                }

                deleteQueue.push({ id: taskId, title: taskTitle, fieldValue });
              }

              scanned++;
              send({ type: "progress", scanned, duplicatesFound, actioned, errors });
            }
          } finally {
            matchDone = true;
          }
        };

        // ── Stage 3: Delete ───────────────────────────────────────────────────
        // 3 concurrent workers drain deleteQueue. Each worker independently
        // awaits a Notion API call, so up to 3 deletions happen in parallel
        // without blocking the match stage.
        const deleteWorker = async () => {
          while (!matchDone || deleteQueue.length > 0) {
            if (deleteQueue.length === 0) {
              await new Promise<void>((resolve) => setTimeout(resolve, 5));
              continue;
            }

            const { id: pageId, title, fieldValue } = deleteQueue.shift()!;

            try {
              if (mode === "archive") {
                await archivePage(pageId, notionToken);
              } else {
                await deletePage(pageId, notionToken);
              }
              actioned++;
              const actionedStatus = mode === "archive" ? "archived" : "deleted";
              send({ type: "page", id: pageId, title, fieldValue, status: actionedStatus });
              send({
                type: "actioned",
                pageId,
                title,
                fieldValue,
                scanned,
                duplicatesFound,
                actioned,
                errors,
              });
            } catch (err) {
              errors++;
              send({ type: "page", id: pageId, title, fieldValue, status: "error" });
              send({
                type: "actionError",
                pageId,
                title,
                error: err instanceof Error ? err.message : "Unknown error",
                scanned,
                duplicatesFound,
                actioned,
                errors,
              });
            }
          }
        };

        // Run all stages concurrently: 1 fetch + 1 match + 3 delete (or drain) workers
        const workers = [fetchWorker(), matchWorker()];
        if (!dryRun) {
          workers.push(deleteWorker(), deleteWorker(), deleteWorker());
        } else {
          // In dry-run mode, drain the deleteQueue without acting — just emit as pending
          const drainWorker = async () => {
            while (!matchDone || deleteQueue.length > 0) {
              if (deleteQueue.length === 0) {
                await new Promise<void>((resolve) => setTimeout(resolve, 5));
                continue;
              }

              const { id: pageId, title, fieldValue } = deleteQueue.shift()!;
              send({ type: "page", id: pageId, title, fieldValue, status: "pending" });
            }
          };
          workers.push(drainWorker(), drainWorker(), drainWorker());
        }
        await Promise.all(workers);

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
