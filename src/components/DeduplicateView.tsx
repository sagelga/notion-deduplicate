"use client";

import { useEffect, useState } from "react";
import "./DeduplicateView.css";

interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

interface DuplicateGroup {
  value: string;
  pages: Page[];
}

type Mode = "archive" | "delete";

export default function DeduplicateView({
  pages,
  fieldName,
  isLoading = false,
  skipEmpty = false,
}: {
  pages: Page[];
  fieldName: string;
  isLoading?: boolean;
  skipEmpty?: boolean;
}) {
  const [keepSelections, setKeepSelections] = useState<Map<string, string>>(new Map());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("archive");
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{ actioned: number; errors: number; mode: Mode } | null>(null);

  useEffect(() => {
    if (!acting) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [acting]);

  // Group pages by field value
  const groups = new Map<string, Page[]>();
  for (const page of pages) {
    const value = page.properties[fieldName] ?? "(empty)";
    if (skipEmpty && (value === "(empty)" || value === null)) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value)!.push(page);
  }

  // Filter to duplicates, sort each group oldest-first
  const duplicateGroups: DuplicateGroup[] = Array.from(groups.entries())
    .filter(([, g]) => g.length > 1)
    .map(([value, g]) => ({
      value,
      pages: [...g].sort(
        (a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      ),
    }))
    .sort((a, b) => b.pages.length - a.pages.length);

  // Effective keep ID per group (user selection or default: oldest)
  const effectiveKeepId = (group: DuplicateGroup) =>
    keepSelections.get(group.value) ?? group.pages[0].id;

  // Pages that will actually be acted on
  const pageIdsToAction = duplicateGroups.flatMap((group) => {
    const keepId = effectiveKeepId(group);
    return group.pages
      .filter((p) => p.id !== keepId && !excludedIds.has(p.id))
      .map((p) => p.id);
  });

  const handleKeepChange = (group: DuplicateGroup, pageId: string) => {
    setKeepSelections((prev) => new Map(prev).set(group.value, pageId));
    // Reset checkbox state for the whole group so newly-demoted pages start checked
    setExcludedIds((prev) => {
      const next = new Set(prev);
      group.pages.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleExcludeToggle = (pageId: string, excluded: boolean) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (excluded) {
        next.add(pageId);
      } else {
        next.delete(pageId);
      }
      return next;
    });
  };

  const handleAction = async () => {
    setActing(true);
    try {
      const res = await fetch("/api/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: pageIdsToAction, mode }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setResult({ actioned: data.actioned, errors: data.errors, mode });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  };

  if (result) {
    const verb = result.mode === "archive" ? "archived" : "deleted";
    return (
      <div className="dedup-result">
        <h3 className="dedup-result-title">Done</h3>
        <div className="dedup-result-stats">
          <p className="dedup-result-stat">
            <span className="val-success">{result.actioned}</span> pages {verb}
          </p>
          {result.errors > 0 && (
            <p className="dedup-result-stat">
              <span className="val-error">{result.errors}</span> errors
            </p>
          )}
        </div>
        <a href="/dashboard" className="dedup-result-back">Back to Dashboard</a>
      </div>
    );
  }

  const actionLabel = acting
    ? mode === "archive" ? "Archiving…" : "Deleting…"
    : mode === "archive"
    ? `Archive ${pageIdsToAction.length} duplicates`
    : `Delete ${pageIdsToAction.length} duplicates`;

  return (
    <div className="dedup-wrapper">
      {/* Summary */}
      <div className="dedup-summary">
        <div className="dedup-stat">
          <span className="dedup-stat-value">{duplicateGroups.length}</span>
          <span className="dedup-stat-label">duplicate groups</span>
        </div>
        <div className="dedup-stat">
          <span className="dedup-stat-value">{pageIdsToAction.length}</span>
          <span className="dedup-stat-label">pages to {mode}</span>
        </div>
        {isLoading && (
          <p className="dedup-loading-note">Still loading — more duplicates may appear</p>
        )}
      </div>

      {/* Groups */}
      <div className="dedup-groups">
        {duplicateGroups.map((group) => {
          const keepId = effectiveKeepId(group);
          return (
            <div key={group.value} className="dedup-group">
              <div className="dedup-group-header">
                <p className="dedup-group-value">{group.value || "(empty value)"}</p>
                <p className="dedup-group-count">{group.pages.length} pages</p>
              </div>
              <div className="dedup-table-scroll">
                <table className="dedup-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.pages.map((page) => {
                      const isKept = page.id === keepId;
                      const isExcluded = excludedIds.has(page.id);
                      const userSelected = keepSelections.has(group.value);
                      return (
                        <tr
                          key={page.id}
                          className={userSelected ? (isKept ? "dedup-row-keep" : "dedup-row-delete") : ""}
                        >
                          <td>{page.title}</td>
                          <td className="mono">
                            {new Date(page.created_time).toLocaleDateString()}
                          </td>
                          <td className="dedup-action-cell">
                            <label className="dedup-radio-label">
                              <input
                                type="radio"
                                name={`keep-${group.value}`}
                                checked={isKept}
                                onChange={() => handleKeepChange(group, page.id)}
                              />
                              <span className={`badge ${isKept ? "badge-keep" : "badge-delete"}`}>
                                {isKept ? "Keep" : "Delete"}
                              </span>
                            </label>
                            {!isKept && (
                              <input
                                type="checkbox"
                                className="dedup-checkbox"
                                checked={!isExcluded}
                                title={isExcluded ? "Skipped — won't be actioned" : "Will be actioned"}
                                onChange={(e) =>
                                  handleExcludeToggle(page.id, !e.target.checked)
                                }
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="dedup-actions">
        <div className="dedup-mode-toggle">
          <label className={`dedup-mode-option ${mode === "archive" ? "active" : ""}`}>
            <input
              type="radio"
              name="mode"
              value="archive"
              checked={mode === "archive"}
              onChange={() => setMode("archive")}
            />
            Archive <span className="dedup-mode-hint">(safer, recoverable)</span>
          </label>
          <label className={`dedup-mode-option ${mode === "delete" ? "active" : ""}`}>
            <input
              type="radio"
              name="mode"
              value="delete"
              checked={mode === "delete"}
              onChange={() => setMode("delete")}
            />
            Permanently delete
          </label>
        </div>
        <button
          onClick={handleAction}
          disabled={acting || pageIdsToAction.length === 0}
          className={`dedup-action-btn ${mode === "delete" ? "dedup-action-btn--danger" : ""}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
