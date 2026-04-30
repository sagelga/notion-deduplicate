// useDatabasePreview.ts
//
// Hook that owns all schema + preview fetching for a selected database.
// Handles parallel fetching, deduplicatable property filtering, and
// preview page normalization. Consumed by DatabaseSelector.

import { useCallback, useEffect, useState } from "react";
import { NotionProperty, getDatabaseSchema, getPropertyValue, type RawNotionPage } from "@/lib/notion";

export const DEDUPLICATABLE_TYPES = new Set([
  "title",
  "rich_text",
  "select",
  "number",
  "email",
  "url",
  "phone_number",
  "checkbox",
  "date",
]);

export interface PreviewPage {
  id: string;
  title: string;
  properties: Record<string, string | null>;
  created_time?: string;
}

interface UseDatabasePreviewOptions {
  token: string;
  databaseId: string;
}

export function useDatabasePreview({ token, databaseId }: UseDatabasePreviewOptions) {
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [previewPages, setPreviewPages] = useState<PreviewPage[]>([]);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [dbTotalCount, setDbTotalCount] = useState<number | undefined>(undefined);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchSchemaAndPreview = useCallback(
    async (dbId: string) => {
      setSchemaLoading(true);
      setPreviewLoading(true);
      let fetchedSchema: NotionProperty[] = [];

      try {
        fetchedSchema = await getDatabaseSchema(dbId, token);
        const deduplicatable = fetchedSchema.filter((p: NotionProperty) =>
          DEDUPLICATABLE_TYPES.has(p.type)
        );
        setProperties(deduplicatable);
      } catch {
        setError("Failed to load database schema");
      } finally {
        setSchemaLoading(false);
      }

      try {
        const previewRes = await fetch("/api/notion-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: `/v1/databases/${dbId}/query`,
            method: "POST",
            token,
            body: { page_size: 20 },
          }),
        });
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          const rawPages: RawNotionPage[] = previewData.results ?? [];
          if (typeof previewData.total === "number") {
            setDbTotalCount(previewData.total);
          }

          const propertyTypeMap = Object.fromEntries(
            fetchedSchema.map((p) => [p.name, p.type])
          );

          const pages = rawPages.map((page) => {
            let title = "(Untitled)";
            const titleEntry = Object.entries(page.properties || {}).find(
              ([, prop]) => prop.type === "title"
            );
            if (titleEntry) {
              title = titleEntry[1].title?.[0]?.plain_text ?? "(Untitled)";
            }

            const normalizedProperties: Record<string, string | null> = {};
            for (const [propName, propValue] of Object.entries(page.properties || {})) {
              normalizedProperties[propName] = getPropertyValue(
                propValue,
                propertyTypeMap[propName] ?? "unknown"
              );
            }

            return {
              id: page.id,
              created_time: page.created_time,
              title,
              properties: normalizedProperties,
            };
          });

          setPreviewPages(pages);
          setPreviewHasMore(previewData.has_more ?? false);
        }
      } catch {
        // Preview failure is non-fatal
      } finally {
        setPreviewLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!databaseId) return;
    fetchSchemaAndPreview(databaseId);
  }, [databaseId, fetchSchemaAndPreview]);

  return {
    properties,
    previewPages,
    previewHasMore,
    dbTotalCount,
    schemaLoading,
    previewLoading,
    error,
  };
}