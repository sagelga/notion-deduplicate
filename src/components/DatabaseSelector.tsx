"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NotionProperty, type NotionDatabase } from "@/lib/notion";
import AutoDeduplicateView from "./AutoDeduplicateView";
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
  const [autoTiming, setAutoTiming] = useState<"now" | "later">("later");
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

  return (
    <div className="db-layout">
      {error && <div className="db-error">{error}</div>}

      {/* ── Sentence-style configuration row ── */}
      <div className="db-config-row">
        <span>Deduplicate</span>

        {/* Database selector */}
        <select
          value={selectedDatabaseId}
          onChange={(e) => handleDatabaseSelect(e.target.value)}
          className="db-select db-config-select"
        >
          <option value="">Choose a database…</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.title[0]?.plain_text || "(Untitled)"}
            </option>
          ))}
        </select>

        <span>by</span>

        {/* Field selector — visible only if database selected */}
        {selectedDatabaseId && properties.length > 0 && !schemaLoading && (
          <>
            <select
              value={selectedProperty}
              onChange={(e) => handlePropertySelect(e.target.value)}
              className="db-select db-config-select"
            >
              <option value="">Choose a field…</option>
              {properties.map((prop) => (
                <option key={prop.name} value={prop.name}>
                  {prop.name} ({prop.type})
                </option>
              ))}
            </select>

            <span>by</span>

            {/* Archive/Delete selector — visible only if field selected */}
            {selectedProperty && (
              <>
                <select
                  value={autoActionMode}
                  onChange={(e) => setAutoActionMode(e.target.value as "archive" | "delete")}
                  className="db-select db-config-select"
                >
                  <option value="archive">archive</option>
                  <option value="delete">delete</option>
                </select>

                <span>magically</span>

                {/* Now/Later selector — visible only if action mode selected */}
                <select
                  value={autoTiming}
                  onChange={(e) => setAutoTiming(e.target.value as "now" | "later")}
                  className="db-select db-config-select"
                >
                  <option value="now">now</option>
                  <option value="later">later</option>
                </select>

                {/* Checkmark button */}
                <button
                  onClick={() => setAutoStarted(true)}
                  className="db-config-checkmark"
                  title="Start deduplication process"
                >
                  ✓
                </button>
              </>
            )}
          </>
        )}

        {/* Schema loading indicator */}
        {schemaLoading && <div className="db-spinner db-spinner--sm" />}
      </div>

      {/* Skip empty checkbox — shown when field selected and not processing */}
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

        {/* Empty placeholder — nothing selected yet */}
        {!hasContent && !schemaLoading && !pagesLoading && !previewLoading && (
          <div className="db-content-placeholder">
            <p className="db-placeholder-text">
              {!selectedDatabaseId
                ? "Select a database to get started"
                : !selectedProperty
                ? "Choose a field to deduplicate by"
                : "Select archive or delete, then click the checkmark to proceed"}
            </p>
          </div>
        )}

        {/* Preview table — only while not processing auto-dedup */}
        {selectedDatabaseId && !autoStarted && (previewLoading || previewPages.length > 0) && (
          <div className="db-card db-preview-card">
            <div className="db-preview-header">
              <span className="db-card-label" style={{ marginBottom: 0 }}>
                Preview
              </span>
              {previewLoading && <div className="db-spinner db-spinner--sm" />}
              {!previewLoading && (
                <span className="db-preview-count">
                  {previewPages.length} pages
                  {previewHasMore ? " from many" : ""}
                </span>
              )}
            </div>
            {previewPages.length > 0 && (() => {
              const totalPages = Math.ceil(previewPages.length / PREVIEW_PAGE_SIZE);
              const start = previewPage * PREVIEW_PAGE_SIZE;
              const visibleRows = previewPages.slice(start, start + PREVIEW_PAGE_SIZE);
              return (
                <>
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
                        {visibleRows.map((page) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="db-preview-pagination">
                      <button
                        className="db-preview-page-btn"
                        disabled={previewPage === 0}
                        onClick={() => setPreviewPage((p) => p - 1)}
                      >
                        ‹ Prev
                      </button>
                      <span className="db-preview-page-info">
                        {start + 1}–{Math.min(start + PREVIEW_PAGE_SIZE, previewPages.length)} of {previewPages.length}
                      </span>
                      <button
                        className="db-preview-page-btn"
                        disabled={previewPage >= totalPages - 1}
                        onClick={() => setPreviewPage((p) => p + 1)}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Auto-deduplicate live view */}
        {selectedProperty && autoStarted && (
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
