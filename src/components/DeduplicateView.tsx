// DeduplicateView.tsx
//
// Manual deduplication UI — the older, user-driven flow (as opposed to
// AutoDeduplicateView which runs automatically). The parent streams pages
// incrementally via the `pages` prop (e.g. from a pagination API); this
// component groups them into duplicate sets in real time without re-processing
// already-seen pages.
//
// Key design decisions:
// - groupsMapRef + processedCountRef enable incremental grouping: only newly
//   appended pages are processed on each render, avoiding O(n²) re-grouping as
//   the page list grows during streaming.
// - rebuildTimerRef debounces the expensive re-sort + setState call at 300ms so
//   rapid page additions don't cause a render per page.
// - While isLoading is true, the group list auto-jumps to the last page so the
//   user sees incoming duplicates as they arrive.
// - keepSelections (Map<fieldValue, pageId>) records which page to keep for each
//   duplicate group; the default is always the oldest page (pages[0] after sort).
// - excludedIds allows individual non-keep pages to be opt-out of the action
//   without changing the keep selection.

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { archivePage, deletePage } from "@/lib/notion";
import { Table, type TableColumn } from "./table/Table";
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

interface DedupeTableRow extends Record<string, unknown> {
  title: { _pageId: string; _title: string };
  created_time: string;
  action: null;
  _pageId: string;
  _isKept: boolean;
  _isExcluded: boolean;
}

const GROUPS_PER_PAGE = 10;

function notionPageUrl(id: string) {
  return `https://www.notion.so/${id.replace(/-/g, "")}`;
}

export default function DeduplicateView({
  pages,
  fieldName,
  isLoading = false,
  skipEmpty = false,
  token,
}: {
  pages: Page[];
  fieldName: string;
  isLoading?: boolean;
  skipEmpty?: boolean;
  token: string;
}) {
  const [keepSelections, setKeepSelections] = useState<Map<string, string>>(new Map());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("archive");
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{ actioned: number; errors: number; mode: Mode } | null>(null);
  const [groupPage, setGroupPage] = useState(0);

  // Incremental grouping: persistent ref stores groups, only add new pages
  const groupsMapRef = useRef<Map<string, Page[]>>(new Map());
  const processedCountRef = useRef(0);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard against accidental navigation while an archive/delete POST is in-flight;
  // the browser will prompt the user to confirm leaving the page.
  useEffect(() => {
    if (!acting) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [acting]);

  // Reset groups when field or skipEmpty changes
  useEffect(() => {
    groupsMapRef.current = new Map();
    processedCountRef.current = 0;
    setDuplicateGroups([]);
  }, [fieldName, skipEmpty]);

  // Rebuild duplicate groups from the map (debounced).
  // Only groups with 2+ pages qualify as duplicates. Within each group, pages are
  // sorted oldest-first (created_time ascending) so pages[0] is the default "keep".
  // Groups are then sorted largest-first so the most impactful duplicates appear at
  // the top of the list.
  const rebuildGroups = () => {
    const groups = Array.from(groupsMapRef.current.entries())
      .filter(([, g]) => g.length > 1)
      .map(([value, g]) => ({
        value,
        pages: [...g].sort((a, b) => (a.created_time < b.created_time ? -1 : 1)),
      }))
      .sort((a, b) => b.pages.length - a.pages.length);
    setDuplicateGroups(groups);
  };

  // Incremental insert of new pages into groups
  useEffect(() => {
    const map = groupsMapRef.current;
    const newPages = pages.slice(processedCountRef.current);
    processedCountRef.current = pages.length;

    for (const page of newPages) {
      const value = page.properties[fieldName] ?? "(empty)";
      if (skipEmpty && (value === "(empty)" || value === null)) continue;
      if (!map.has(value)) map.set(value, []);
      map.get(value)!.push(page);
    }

    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(rebuildGroups, 300);
  }, [pages, fieldName, skipEmpty]);

  // Auto-jump to last page while scanning so user sees incoming duplicates
  useEffect(() => {
    if (!isLoading) return;
    const lastPage = Math.max(0, Math.ceil(duplicateGroups.length / GROUPS_PER_PAGE) - 1);
    setGroupPage(lastPage);
  }, [duplicateGroups.length, isLoading]);

  const totalGroupPages = Math.max(1, Math.ceil(duplicateGroups.length / GROUPS_PER_PAGE));
  const visibleGroups = duplicateGroups.slice(
    groupPage * GROUPS_PER_PAGE,
    (groupPage + 1) * GROUPS_PER_PAGE
  );

  // Returns the page ID the user wants to keep for a group, falling back to
  // the oldest page (pages[0]) if the user hasn't made an explicit selection yet.
  const effectiveKeepId = (group: DuplicateGroup) =>
    keepSelections.get(group.value) ?? group.pages[0].id;

  const pageIdsToAction = useMemo(() => duplicateGroups.flatMap((group) => {
    const keepId = keepSelections.get(group.value) ?? group.pages[0].id;
    return group.pages
      .filter((p) => p.id !== keepId && !excludedIds.has(p.id))
      .map((p) => p.id);
  }), [duplicateGroups, keepSelections, excludedIds]);

  // When the user picks a new "keep" page, also clear any per-page exclusions in
  // that group so the newly revealed delete targets start in the default checked state.
  const handleKeepChange = (group: DuplicateGroup, pageId: string) => {
    setKeepSelections((prev) => new Map(prev).set(group.value, pageId));
    setExcludedIds((prev) => {
      const next = new Set(prev);
      group.pages.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleExcludeToggle = (pageId: string, excluded: boolean) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (excluded) next.add(pageId);
      else next.delete(pageId);
      return next;
    });
  };

  const handleAction = async () => {
    setActing(true);
    try {
      let actionedCount = 0;
      let errorCount = 0;
      const queue = [...pageIdsToAction];

      // 3 concurrent workers — same concurrency as the server route
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length > 0) {
          const pageId = queue.shift()!;
          try {
            if (mode === "archive") {
              await archivePage(pageId, token);
            } else {
              await deletePage(pageId, token);
            }
            actionedCount++;
          } catch {
            errorCount++;
          }
        }
      });

      await Promise.all(workers);
      setResult({ actioned: actionedCount, errors: errorCount, mode });
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
        <a href="/duplicate" className="dedup-result-back">Back to Duplicate</a>
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
          <p className="dedup-loading-note">Still scanning — more may appear</p>
        )}
      </div>

      {/* Groups */}
      <div className="dedup-groups">
        {visibleGroups.map((group) => {
          const keepId = effectiveKeepId(group);
          const userSelected = keepSelections.has(group.value);

          const columns: TableColumn[] = [
            {
              key: "title",
              label: "Title",
              format: (value): ReactNode => {
                const titleData = value as DedupeTableRow["title"];
                return (
                  <a
                    href={notionPageUrl(titleData._pageId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dedup-page-link"
                  >
                    {titleData._title || "(Untitled)"}
                  </a>
                );
              },
            },
            {
              key: "created_time",
              label: "Created",
              align: "left",
              format: (value): ReactNode => new Date(value as string).toLocaleDateString(),
            },
            {
              key: "action",
              label: "Action",
              format: (_, row): ReactNode => {
                const dedupeRow = row as unknown as DedupeTableRow;
                return (
                  <div className="dedup-action-cell">
                    <label className="dedup-radio-label">
                      <input
                        type="radio"
                        name={`keep-${group.value}`}
                        checked={dedupeRow._isKept}
                        onChange={() => handleKeepChange(group, dedupeRow._pageId)}
                      />
                      <span className={`badge ${dedupeRow._isKept ? "badge-keep" : "badge-delete"}`}>
                        {dedupeRow._isKept ? "Keep" : "Delete"}
                      </span>
                    </label>
                    {!dedupeRow._isKept && (
                      <input
                        type="checkbox"
                        className="dedup-checkbox"
                        checked={!dedupeRow._isExcluded}
                        title={dedupeRow._isExcluded ? "Skipped — won't be actioned" : "Will be actioned"}
                        onChange={(e) =>
                          handleExcludeToggle(dedupeRow._pageId, !e.target.checked)
                        }
                      />
                    )}
                  </div>
                );
              },
            },
          ];

          const tableRows = group.pages.map((page): DedupeTableRow => ({
            title: { _pageId: page.id, _title: page.title },
            created_time: page.created_time,
            action: null,
            _pageId: page.id,
            _isKept: page.id === keepId,
            _isExcluded: excludedIds.has(page.id),
          }));

          return (
            <div key={group.value} className="dedup-group">
              <div className="dedup-group-header">
                <p className="dedup-group-value">{group.value || "(empty value)"}</p>
                <p className="dedup-group-count">{group.pages.length} pages</p>
              </div>
              <Table
                columns={columns}
                rows={tableRows}
                rowKey={(row) => (row as unknown as DedupeTableRow)._pageId}
                rowClassName={(row) => {
                  const dedupeRow = row as unknown as DedupeTableRow;
                  return userSelected ? (dedupeRow._isKept ? "dedup-row-keep" : "dedup-row-delete") : "";
                }}
                className="dedup-table"
              />
            </div>
          );
        })}
      </div>

      {/* Group pagination */}
      {totalGroupPages > 1 && (
        <div className="dedup-pagination">
          <button
            className="dedup-page-btn"
            disabled={groupPage === 0}
            onClick={() => setGroupPage((p) => p - 1)}
          >
            ‹ Prev
          </button>
          <span className="dedup-page-info">
            {groupPage + 1} / {totalGroupPages}
          </span>
          <button
            className="dedup-page-btn"
            disabled={groupPage >= totalGroupPages - 1}
            onClick={() => setGroupPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
      )}

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
            Permanently delete <span className="dedup-mode-hint">(cannot be undone)</span>
          </label>
        </div>
        {mode === "delete" && (
          <p className="dedup-delete-warning">
            Archive moves pages to Notion&rsquo;s trash — restorable for 30&nbsp;days.
            Delete permanently removes them with no recovery.{" "}
            <a
              href="https://www.notion.com/help/archive-or-delete-content"
              target="_blank"
              rel="noopener noreferrer"
              className="dedup-delete-warning-link"
            >
              Learn more
            </a>
          </p>
        )}
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
