"use client";

import { useEffect, useState } from "react";
import { NotionProperty, type NotionDatabase } from "@/lib/notion";
import DeduplicateView from "./DeduplicateView";
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
  const [dedupeMode, setDedupeMode] = useState<"review" | "auto" | null>(null);
  const [autoActionMode, setAutoActionMode] = useState<"archive" | "delete">("archive");
  const [autoStarted, setAutoStarted] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState(true);

  // Preview state — first 50 rows shown at the bottom
  const [previewPages, setPreviewPages] = useState<Page[]>([]);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);

  const PREVIEW_PAGE_SIZE = 20;

  const loadPages = async (databaseId: string, propertyName: string) => {
    setSelectedProperty(propertyName);
    setPages([]);
    setPagesLoaded(0);
    setError("");
    setPagesLoading(true);

    try {
      const response = await fetch(`/api/databases/${databaseId}/pages`);

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
            setPages((prev) => [...prev, ...msg.pages!]);
            setPagesLoaded((prev) => prev + msg.pages!.length);
          } else if (msg.type === "done") {
            setPagesLoading(false);
          } else if (msg.type === "error") {
            throw new Error(msg.message ?? "Unknown error");
          }
        }
      }
    } catch (err) {
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
    setDedupeMode(null);
    setAutoStarted(false);
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
    setDedupeMode(null);
    setAutoStarted(false);
  };

  const isLoading = schemaLoading || pagesLoading;

  useEffect(() => {
    if (!pagesLoading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pagesLoading]);

  // Columns to show in the preview table: selected field first, then the rest
  const previewColumns = properties
    .filter((p) => DEDUPLICATABLE_TYPES.has(p.type))
    .sort((a, b) => {
      if (a.name === selectedProperty) return -1;
      if (b.name === selectedProperty) return 1;
      return 0;
    });

  return (
    <div className="db-selector">
      {error && <div className="db-error">{error}</div>}

      <div className="db-card">
        <label className="db-card-label">Select Database</label>
        <select
          value={selectedDatabaseId}
          onChange={(e) => handleDatabaseSelect(e.target.value)}
          className="db-select"
        >
          <option value="">Choose a database…</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.title[0]?.plain_text || "(Untitled)"}
            </option>
          ))}
        </select>
      </div>

      {selectedDatabaseId && properties.length > 0 && !schemaLoading && (
        <div className="db-card">
          <label className="db-card-label">Deduplicate By</label>
          <select
            value={selectedProperty}
            onChange={(e) => handlePropertySelect(e.target.value)}
            className="db-select"
          >
            <option value="">Choose a field…</option>
            {properties.map((prop) => (
              <option key={prop.name} value={prop.name}>
                {prop.name} ({prop.type})
              </option>
            ))}
          </select>

          {selectedProperty && (
            <label className="db-skip-empty">
              <input
                type="checkbox"
                checked={skipEmpty}
                onChange={(e) => {
                  setSkipEmpty(e.target.checked);
                  setDedupeMode(null);
                  setAutoStarted(false);
                }}
              />
              <span>
                Skip pages where <strong>{selectedProperty}</strong> is empty
                <span className="db-mode-hint"> — prevents blank values from matching each other</span>
              </span>
            </label>
          )}
        </div>
      )}

      {selectedProperty && dedupeMode === null && !schemaLoading && !pagesLoading && (
        <div className="db-card">
          <div className="db-mode-choice">
            <p className="db-mode-label">How would you like to proceed?</p>
            <button
              onClick={() => {
                setDedupeMode("review");
                loadPages(selectedDatabaseId, selectedProperty);
              }}
              className="db-mode-btn"
            >
              Scan &amp; Review
              <span className="db-mode-hint">Load all pages first, then choose what to remove</span>
            </button>
            <button
              onClick={() => setDedupeMode("auto")}
              className="db-mode-btn db-mode-btn--auto"
            >
              Auto-deduplicate
              <span className="db-mode-hint">Stream through pages and remove duplicates immediately</span>
            </button>
          </div>
        </div>
      )}

      {schemaLoading && (
        <div className="db-loading">
          <div className="db-spinner" />
          <p className="db-loading-text">Loading schema…</p>
        </div>
      )}

      {pagesLoading && (
        <div className="db-loading">
          <div className="db-spinner" />
          <p className="db-loading-text">
            Scanning pages… {pagesLoaded > 0 ? `${pagesLoaded} loaded` : ""}
          </p>
        </div>
      )}

      {selectedProperty && dedupeMode === "review" && pages.length > 0 && (
        <DeduplicateView
          pages={pages}
          fieldName={selectedProperty}
          isLoading={pagesLoading}
          skipEmpty={skipEmpty}
        />
      )}

      {selectedProperty && dedupeMode === "review" && pages.length === 0 && !isLoading && (
        <div className="db-empty">No pages found in this database</div>
      )}

      {selectedProperty && dedupeMode === "auto" && !autoStarted && (
        <div className="db-card">
          <div className="db-auto-confirm">
            <div className="db-auto-mode-toggle">
              <label className={`dedup-mode-option ${autoActionMode === "archive" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="auto-mode"
                  value="archive"
                  checked={autoActionMode === "archive"}
                  onChange={() => setAutoActionMode("archive")}
                />
                Archive <span className="dedup-mode-hint">(safer, recoverable)</span>
              </label>
              <label className={`dedup-mode-option ${autoActionMode === "delete" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="auto-mode"
                  value="delete"
                  checked={autoActionMode === "delete"}
                  onChange={() => setAutoActionMode("delete")}
                />
                Permanently delete
              </label>
            </div>
            <button
              onClick={() => setAutoStarted(true)}
              className="db-auto-start-btn"
            >
              Start Auto-Deduplicate
            </button>
          </div>
        </div>
      )}

      {selectedProperty && dedupeMode === "auto" && autoStarted && (
        <div className="db-card">
          <AutoDeduplicateView
            databaseId={selectedDatabaseId}
            fieldName={selectedProperty}
            mode={autoActionMode}
            skipEmpty={skipEmpty}
          />
        </div>
      )}

      {/* Preview table — shown at the bottom after database is selected */}
      {selectedDatabaseId && (previewLoading || previewPages.length > 0) && (
        <div className="db-card db-preview-card">
          <div className="db-preview-header">
            <span className="db-card-label" style={{ marginBottom: 0 }}>
              Preview
            </span>
            {previewLoading && <div className="db-spinner db-spinner--sm" />}
            {!previewLoading && (
              <span className="db-preview-count">
                {previewPages.length} rows
                {previewHasMore ? " (more in database)" : ""}
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
    </div>
  );
}
