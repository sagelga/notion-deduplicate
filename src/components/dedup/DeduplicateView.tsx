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

import { useEffect, useMemo, useRef, useState } from "react";
import { archivePage, deletePage } from "@/lib/notion";
import { DedupGroupsList } from "./DedupGroupsList";
import { DedupActionBar } from "./DedupActionBar";
import type { Page, DuplicateGroup, Mode } from "./dedup-types";
import "./DeduplicateView.css";

const GROUPS_PER_PAGE = 10;

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

  const groupsMapRef = useRef<Map<string, Page[]>>(new Map());
  const processedCountRef = useRef(0);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!acting) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [acting]);

  useEffect(() => {
    groupsMapRef.current = new Map();
    processedCountRef.current = 0;
    setDuplicateGroups([]);
  }, [fieldName, skipEmpty]);

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

  const pageIdsToAction = useMemo(() => duplicateGroups.flatMap((group) => {
    const keepId = keepSelections.get(group.value) ?? group.pages[0].id;
    return group.pages
      .filter((p) => p.id !== keepId && !excludedIds.has(p.id))
      .map((p) => p.id);
  }), [duplicateGroups, keepSelections, excludedIds]);

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

  return (
    <div className="dedup-wrapper">
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

      <DedupGroupsList
        visibleGroups={visibleGroups}
        keepSelections={keepSelections}
        excludedIds={excludedIds}
        onKeepChange={handleKeepChange}
        onExcludeToggle={handleExcludeToggle}
      />

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

      <DedupActionBar
        pageIdsToAction={pageIdsToAction.length}
        mode={mode}
        acting={acting}
        onModeChange={setMode}
        onAction={handleAction}
      />
    </div>
  );
}
