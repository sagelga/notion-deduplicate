// DatabaseSelector.tsx
//
// Top-level client component for the /duplicate page. It owns all pre-run
// configuration state and renders:
//   1. ConfigRow — the sentence-style "Deduplicate [db] using [field] by [action] …" UI
//   2. DatabasePreviewTable — a read-only sample of the selected database
//   3. AutoDeduplicateView — mounted once the user clicks ✓ to start a run
//
// Flow:
//   - On mount, the first database is auto-selected and its schema + preview are
//     fetched in parallel.
//   - Changing the database resets all run state (autoStarted, dryRunConfirmed, etc.)
//     and re-fetches schema + preview.
//   - When autoTiming === "later", the first run is a dry run (dryRun=true).
//     AutoDeduplicateView calls onConfirm() when the user approves the preview, which
//     sets dryRunConfirmed=true and causes a re-mount with dryRun=false (the "real" run).
//   - The AutoDeduplicateView key ("dry-run" / "real-run") forces a fresh mount
//     between the dry-run preview and the confirmed live run.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NotionProperty, type NotionDatabase, getDatabaseSchema, getPropertyValue, type RawNotionPage } from "@/lib/notion";
import AutoDeduplicateView from "./AutoDeduplicateView";
import { ConfigRow } from "./config-row/ConfigRow";
import { Table, type TableColumn } from "./table/Table";
import "./DatabaseSelector.css";

// Only these Notion property types produce values that can meaningfully be
// compared for equality. Formula, rollup, relation, etc. are excluded because
// their values are derived or complex and produce inconsistent duplicate signals.
const DEDUPLICATABLE_TYPES = new Set([
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

export default function DatabaseSelector({
  databases,
  token,
}: {
  databases: NotionDatabase[];
  token: string;
}) {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [autoActionMode, setAutoActionMode] = useState<"archive" | "delete">("archive");
  const [autoExecutionMode, setAutoExecutionMode] = useState<"magically" | "manually">("magically");
  const [autoTiming, setAutoTiming] = useState<"now" | "later">("now");
  const [autoStarted, setAutoStarted] = useState(false);
  const [dryRunConfirmed, setDryRunConfirmed] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState<"skip" | "allow">("skip");
  const [previewPages, setPreviewPages] = useState<Array<{ id: string; title: string; properties: Record<string, string | null> }>>([]);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dbTotalCount, setDbTotalCount] = useState<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);

  // Consolidated fetch function: schema + preview in parallel, with shared error handling
  const fetchSchemaAndPreview = useCallback(
    async (databaseId: string) => {
      setSchemaLoading(true);
      setPreviewLoading(true);

      // fetchedSchema is scoped to this call so the preview step can use
      // the just-fetched data without referencing the `properties` state —
      // which would put `properties` in the useCallback deps, recreate the
      // callback every time schema loads, and trigger an infinite fetch loop.
      let fetchedSchema: NotionProperty[] = [];

      try {
        // Fetch schema first since preview normalization needs it
        fetchedSchema = await getDatabaseSchema(databaseId, token);
        const deduplicatable = fetchedSchema.filter((p: NotionProperty) =>
          DEDUPLICATABLE_TYPES.has(p.type)
        );
        setProperties(deduplicatable);

        // Auto-select title field (or first available)
        if (deduplicatable.length > 0) {
          const titleProp =
            deduplicatable.find((p: NotionProperty) => p.type === "title") ??
            deduplicatable[0];
          setSelectedProperty(titleProp.name);
        }
      } catch {
        setError("Failed to load database schema");
      } finally {
        setSchemaLoading(false);
      }

      // Fetch and normalize preview (non-fatal if it fails).
      // Routed through the server proxy — Notion blocks CORS for integration tokens.
      try {
        const previewRes = await fetch("/api/notion-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: `/v1/databases/${databaseId}/query`,
            method: "POST",
            token,
            body: { page_size: 20 },
          }),
        });
        if (previewRes.ok) {
          const previewData = await previewRes.json();
          const rawPages: RawNotionPage[] = previewData.results ?? [];
          // Use total from Notion API if available (some databases expose it)
          if (typeof previewData.total === "number") {
            setDbTotalCount(previewData.total);
          }

          // Use fetchedSchema (not the `properties` state) to avoid stale closure.
          const propertyTypeMap = Object.fromEntries(
            fetchedSchema.map((p) => [p.name, p.type])
          );

          const pages = rawPages.map((page) => {
            // Extract title from properties
            let title = "(Untitled)";
            const titleEntry = Object.entries(page.properties || {}).find(
              ([, prop]) => prop.type === "title"
            );
            if (titleEntry) {
              title = titleEntry[1].title?.[0]?.plain_text ?? "(Untitled)";
            }

            // Normalize all properties
            const normalizedProperties: Record<string, string | null> = {};
            for (const [propName, propValue] of Object.entries(
              page.properties || {}
            )) {
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

  const handleDatabaseSelect = async (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setSelectedProperty("");
    setProperties([]);
    setError("");
    setAutoStarted(false);
    setDryRunConfirmed(false);
    setIsRunning(false);
    setPreviewPages([]);
    setPreviewHasMore(false);
    setDbTotalCount(undefined);

    if (!databaseId) return;

    await fetchSchemaAndPreview(databaseId);
  };

  // Auto-select first database on mount
  useEffect(() => {
    if (databases.length > 0 && !selectedDatabaseId) {
      setSelectedDatabaseId(databases[0].id);
    }
  }, [databases, selectedDatabaseId]);

  // Fetch schema + preview whenever selectedDatabaseId changes
  useEffect(() => {
    if (!selectedDatabaseId) return;
    fetchSchemaAndPreview(selectedDatabaseId);
  }, [selectedDatabaseId, fetchSchemaAndPreview]);

  const handlePropertySelect = (propertyName: string) => {
    if (!propertyName || !selectedDatabaseId) return;
    setSelectedProperty(propertyName);
    setAutoStarted(false);
    setDryRunConfirmed(false);
  };

  // Build the ordered column list for the preview table. The currently selected
  // dedup field is sorted first so it's immediately visible without scrolling.
  // Columns to show in the preview table: selected field first, then the rest
  const previewColumns = useMemo(
    () =>
      properties
        .filter((p) => DEDUPLICATABLE_TYPES.has(p.type))
        .sort((a, b) => {
          if (a.name === selectedProperty) return -1;
          if (b.name === selectedProperty) return 1;
          return 0;
        }),
    [properties, selectedProperty]
  );

  // Transform previewPages into flat rows for the Table component
  const tableRows = useMemo(() => {
    return previewPages.map((page) => ({
      id: page.id,
      title: page.title,
      ...page.properties,
    }));
  }, [previewPages]);

  // Build table column definitions
  const tableColumns = useMemo(() => {
    const cols: TableColumn[] = [
      { key: "title", label: "Title" },
      ...previewColumns.map((col) => ({
        key: col.name,
        label: col.name,
      })),
    ];
    return cols;
  }, [previewColumns]);

  return (
    <div className="db-layout">
      {error && <div className="db-error">{error}</div>}

      {/* Config rows */}
      <ConfigRow
        databases={databases}
        selectedDatabaseId={selectedDatabaseId}
        onDatabaseSelect={handleDatabaseSelect}
        properties={properties}
        selectedProperty={selectedProperty}
        onPropertySelect={handlePropertySelect}
        schemaLoading={schemaLoading}
        autoActionMode={autoActionMode}
        onActionModeChange={setAutoActionMode}
        autoExecutionMode={autoExecutionMode}
        onExecutionModeChange={setAutoExecutionMode}
        autoTiming={autoTiming}
        onTimingChange={setAutoTiming}
        onStart={() => { setAutoStarted(true); setIsRunning(true); }}
        skipEmpty={skipEmpty}
        scanRowCount={dbTotalCount}
        onSkipEmptyChange={(value) => {
          setSkipEmpty(value);
          setAutoStarted(false);
          setDryRunConfirmed(false);
        }}
        isRunning={isRunning}
      />


      {/* Preview table shown only before a run starts */}
      {!autoStarted && selectedDatabaseId && (
        <div className="db-main-content">
          <Table
            columns={tableColumns}
            rows={tableRows}
            loading={previewLoading}
            hasMore={previewHasMore}
            pageSize={20}
            activeColumn={selectedProperty || "title"}
            cardHeader={{
              label: "Preview",
              showRowCount: true,
              showSpinner: true,
            }}
            rowKey={(row) => (row.id as string) || (row.title as string)}
            skeletonRows={5}
          />
        </div>
      )}

      {/* AutoDeduplicateView lives at db-layout level so its stats bar sits
          directly below the config row, not nested inside db-main-content. */}
      {autoStarted && (
        // key forces a full unmount+remount when transitioning from dry-run
        // preview to the confirmed live run, resetting all stream/ref state.
        <AutoDeduplicateView
          key={dryRunConfirmed ? "real-run" : "dry-run"}
          databaseId={selectedDatabaseId}
          databaseName={
            databases.find((db) => db.id === selectedDatabaseId)?.title?.[0]?.plain_text ??
            "Untitled database"
          }
          fieldName={selectedProperty}
          mode={autoActionMode}
          skipEmpty={skipEmpty === "skip"}
          dryRun={autoTiming === "later" && !dryRunConfirmed}
          onConfirm={() => setDryRunConfirmed(true)}
          onPhaseChange={(p) => setIsRunning(p === "running" || p === "paused")}
          onReset={() => {
            setAutoStarted(false);
            setDryRunConfirmed(false);
            setIsRunning(false);
          }}
          token={token}
        />
      )}
    </div>
  );
}
