"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NotionProperty, type NotionDatabase } from "@/lib/notion";
import AutoDeduplicateView from "./AutoDeduplicateView";
import { CustomDropdown, type CustomDropdownOption } from "./CustomDropdown";
import "./DatabaseSelector.css";

interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

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
}: {
  databases: NotionDatabase[];
}) {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [pages, setPages] = useState<Page[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [error, setError] = useState<string>("");
  const [autoActionMode, setAutoActionMode] = useState<"archive" | "delete">("archive");
  const [autoExecutionMode, setAutoExecutionMode] = useState<"magically" | "manually">("magically");
  const [autoTiming, setAutoTiming] = useState<"now" | "later">("now");
  const [autoStarted, setAutoStarted] = useState(false);
  const [dryRunConfirmed, setDryRunConfirmed] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [previewPages, setPreviewPages] = useState<Page[]>([]);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);

  const PREVIEW_PAGE_SIZE = 20;

  // Refs for batching page accumulation to avoid O(n²) array spreads
  const pagesAccRef = useRef<Page[]>([]);
  const rafRef = useRef<number | null>(null);

  const loadPages = async (databaseId: string, propertyName: string) => {
    setSelectedProperty(propertyName);
    setPages([]);
    setPagesLoaded(0);
    setError("");
    setPagesLoading(true);
    pagesAccRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    try {
      const response = await fetch(`/api/databases/${databaseId}/pages?fields=${encodeURIComponent(propertyName)}`);

      if (!response.ok || !response.body) {
        throw new Error("Failed to fetch pages");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let msg: { type: string; pages?: Page[]; total?: number; message?: string };
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }

          if (msg.type === "batch" && msg.pages) {
            pagesAccRef.current.push(...msg.pages!);
            setPagesLoaded(pagesAccRef.current.length);
            if (rafRef.current === null) {
              rafRef.current = requestAnimationFrame(() => {
                setPages([...pagesAccRef.current]);
                rafRef.current = null;
              });
            }
          } else if (msg.type === "done") {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            setPages([...pagesAccRef.current]);
            setPagesLoading(false);
          } else if (msg.type === "error") {
            throw new Error(msg.message ?? "Unknown error");
          }
        }
      }
    } catch (err) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
      setPagesLoading(false);
    }
  };

  const handleDatabaseSelect = async (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setSelectedProperty("");
    setProperties([]);
    setPages([]);
    setPagesLoaded(0);
    setError("");
    setAutoStarted(false);
    setDryRunConfirmed(false);
    setPreviewPages([]);
    setPreviewHasMore(false);
    setPreviewPage(0);

    if (!databaseId) return;

    // Fetch schema and preview in parallel
    setSchemaLoading(true);
    setPreviewLoading(true);

    const [schemaRes, previewRes] = await Promise.allSettled([
      fetch(`/api/databases/${databaseId}/schema`),
      fetch(`/api/databases/${databaseId}/preview`),
    ]);

    // Handle schema
    if (schemaRes.status === "fulfilled" && schemaRes.value.ok) {
      try {
        const { schema } = await schemaRes.value.json();
        const deduplicatable = schema.filter((p: NotionProperty) =>
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
      }
    } else {
      setError("Failed to load database schema");
    }
    setSchemaLoading(false);

    // Handle preview
    if (previewRes.status === "fulfilled" && previewRes.value.ok) {
      try {
        const data = await previewRes.value.json();
        setPreviewPages(data.pages ?? []);
        setPreviewHasMore(data.hasMore ?? false);
      } catch {
        // Preview failing is non-fatal
      }
    }
    setPreviewLoading(false);
  };

  const handlePropertySelect = (propertyName: string) => {
    if (!propertyName || !selectedDatabaseId) return;
    setSelectedProperty(propertyName);
    setAutoStarted(false);
    setDryRunConfirmed(false);
  };

  useEffect(() => {
    if (!pagesLoading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pagesLoading]);

  // Columns to show in the preview table: selected field first, then the rest
  const previewColumns = useMemo(() =>
    properties
      .filter((p) => DEDUPLICATABLE_TYPES.has(p.type))
      .sort((a, b) => {
        if (a.name === selectedProperty) return -1;
        if (b.name === selectedProperty) return 1;
        return 0;
      }),
    [properties, selectedProperty]
  );

  const isProcessing = autoStarted;
  const selectedDatabase = databases.find((db) => db.id === selectedDatabaseId);

  const hasContent =
    (selectedDatabaseId && !autoStarted) ||
    (selectedProperty && autoStarted);

  // Dropdown options with descriptions
  const databaseOptions: CustomDropdownOption[] = databases.map((db) => ({
    value: db.id,
    label: db.title[0]?.plain_text || "(Untitled)",
  }));

  const propertyOptions: CustomDropdownOption[] = properties.map((prop) => ({
    value: prop.name,
    label: prop.name,
    description: `(${prop.type})`,
  }));

  const actionModeOptions: CustomDropdownOption[] = [
    {
      value: "archive",
      label: "Archive",
      description: "Move to trash, recoverable for 30 days",
    },
    {
      value: "delete",
      label: "Delete",
      description: "Permanently remove with no recovery",
    },
  ];

  const executionModeOptions: CustomDropdownOption[] = [
    {
      value: "magically",
      label: "Magically",
      description: "Auto-detect & remove duplicates automatically",
    },
    {
      value: "manually",
      label: "Manually",
      description: "Review duplicates before removing (coming soon)",
      disabled: true,
    },
  ];

  const timingOptions: CustomDropdownOption[] = [
    {
      value: "now",
      label: "Now",
      description: "Execute immediately without preview",
    },
    {
      value: "later",
      label: "Later",
      description: "Show preview first, then confirm action",
    },
  ];

  return (
    <div className="db-layout">
      {error && <div className="db-error">{error}</div>}

      {/* ── Sentence-style configuration row ── */}
      <div className="db-config-row">
        <span className="db-config-text">Deduplicate</span>

        {/* Database selector */}
        <CustomDropdown
          value={selectedDatabaseId}
          onChange={(value) => handleDatabaseSelect(value)}
          options={databaseOptions}
          inline
        />

        <span className="db-config-text">using</span>

        {/* Property selector */}
        <CustomDropdown
          value={selectedProperty}
          onChange={(value) => handlePropertySelect(value)}
          options={propertyOptions}
          disabled={!selectedDatabaseId || schemaLoading}
          inline
        />

        <span className="db-config-text">by</span>

        {/* Archive/Delete selector */}
        <CustomDropdown
          value={autoActionMode}
          onChange={(value) => setAutoActionMode(value as "archive" | "delete")}
          options={actionModeOptions}
          disabled={!selectedProperty}
          inline
        />

        {/* Execution mode selector */}
        <CustomDropdown
          value={autoExecutionMode}
          onChange={(value) => setAutoExecutionMode(value as "magically" | "manually")}
          options={executionModeOptions}
          disabled={!selectedProperty}
          inline
        />

        {/* Timing selector */}
        <CustomDropdown
          value={autoTiming}
          onChange={(value) => setAutoTiming(value as "now" | "later")}
          options={timingOptions}
          disabled={!selectedProperty}
          inline
        />

        {/* Checkmark button */}
        <button
          onClick={() => setAutoStarted(true)}
          className="db-config-checkmark"
          disabled={!selectedDatabaseId || !selectedProperty}
          title="Start deduplication process"
        >
          ✓
        </button>

        {/* Schema loading indicator */}
        {schemaLoading && <div className="db-spinner db-spinner--sm" />}
      </div>

      {/* Skip empty checkbox */}
      {selectedProperty && !autoStarted && (
        <label className="db-skip-empty">
          <input
            type="checkbox"
            checked={skipEmpty}
            onChange={(e) => {
              setSkipEmpty(e.target.checked);
              setAutoStarted(false);
              setDryRunConfirmed(false);
            }}
          />
          <span>
            Skip pages where <strong>{selectedProperty}</strong> is empty
            <span className="db-mode-hint"> — prevents blank values from matching each other</span>
          </span>
        </label>
      )}

      {/* ── Main content area ── */}
      <div className="db-main-content">

        {/* Preview table — always shown */}
        {selectedDatabaseId && (
          <div className="db-card db-preview-card">
            <div className="db-preview-header">
              <span className="db-card-label" style={{ marginBottom: 0 }}>
                Preview
              </span>
              {previewLoading && <div className="db-spinner db-spinner--sm" />}
              {!previewLoading && previewPages.length > 0 && (
                <span className="db-preview-count">
                  {previewPages.length} pages
                  {previewHasMore ? " from many" : ""}
                </span>
              )}
            </div>
            <div className="db-preview-scroll">
              <table className="db-preview-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    {previewColumns.map((col) => (
                      <th
                        key={col.name}
                        className={col.name === selectedProperty ? "db-preview-th--active" : ""}
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewLoading || previewPages.length === 0 ? (
                    /* Skeleton loading rows */
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="db-preview-row--skeleton">
                        <td className="db-preview-title">
                          <div className="db-skeleton" style={{ width: "60%", height: "1rem" }} />
                        </td>
                        {previewColumns.map((col) => (
                          <td key={col.name} className="db-preview-cell">
                            <div className="db-skeleton" style={{ width: "80%", height: "0.875rem" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    /* Actual preview rows */
                    (() => {
                      const totalPages = Math.ceil(previewPages.length / PREVIEW_PAGE_SIZE);
                      const start = previewPage * PREVIEW_PAGE_SIZE;
                      const visibleRows = previewPages.slice(start, start + PREVIEW_PAGE_SIZE);
                      return visibleRows.map((page) => (
                        <tr key={page.id}>
                          <td className="db-preview-title">{page.title}</td>
                          {previewColumns.map((col) => (
                            <td
                              key={col.name}
                              className={`db-preview-cell${col.name === selectedProperty ? " db-preview-cell--active" : ""}${!page.properties[col.name] ? " db-preview-cell--empty" : ""}`}
                            >
                              {page.properties[col.name] ?? <span className="db-preview-empty">—</span>}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>
            {previewPages.length > 0 && !previewLoading && (() => {
              const totalPages = Math.ceil(previewPages.length / PREVIEW_PAGE_SIZE);
              return totalPages > 1 ? (
                <div className="db-preview-pagination">
                  <button
                    className="db-preview-page-btn"
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage((p) => p - 1)}
                  >
                    ‹ Prev
                  </button>
                  <span className="db-preview-page-info">
                    {previewPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewPages.length)} of{" "}
                    {previewPages.length}
                  </span>
                  <button
                    className="db-preview-page-btn"
                    disabled={previewPage >= totalPages - 1}
                    onClick={() => setPreviewPage((p) => p + 1)}
                  >
                    Next ›
                  </button>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Auto-deduplicate live view */}
        {autoStarted && (
          <AutoDeduplicateView
            key={dryRunConfirmed ? "real-run" : "dry-run"}
            databaseId={selectedDatabaseId}
            databaseName={
              databases.find((db) => db.id === selectedDatabaseId)?.title?.[0]?.plain_text ??
              "Untitled database"
            }
            fieldName={selectedProperty}
            mode={autoActionMode}
            skipEmpty={skipEmpty}
            dryRun={autoTiming === "later" && !dryRunConfirmed}
            onConfirm={() => setDryRunConfirmed(true)}
          />
        )}

      </div>
    </div>
  );
}
