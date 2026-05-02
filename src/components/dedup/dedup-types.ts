// dedup-types.ts
//
// Shared type definitions used by AutoDeduplicateView, DeduplicateView, and
// related dedup components. Kept separate from the global types/ barrel to
// co-locate dedup-specific types near the components that use them.
//
// ── Constants ────────────────────────────────────────────────────────────────
//
// Maximum log entries retained in memory and displayed in the log panel.
// Older entries beyond this limit are still kept in allLogsRef (full export)
// but pruned from the visible display to avoid performance degradation.
export const LOG_DISPLAY_LIMIT = 500;

// Number of duplicate groups shown per page in the manual dedup UI.
export const GROUPS_PER_PAGE = 10;

// Number of results rows shown per page in the auto-dedup results table.
export const RESULTS_TABLE_PAGE_SIZE = 20;

// "archive" — soft-delete via Notion's archived flag (reversible, moves to trash)
// "delete"  — hard-delete via the blocks API (permanent)
export type Mode = "archive" | "delete";

// Lifecycle states of an individual page row in the dedup results table:
//   kept     — oldest occurrence, will not be actioned
//   archived — duplicate that was archived successfully
//   deleted  — duplicate that was hard-deleted successfully
//   skipped  — duplicate skipped because the field value was null/empty
//   retry    — first deletion attempt failed; page is in the retry queue
//   error    — all attempts exhausted; page must be deleted manually
//   pending  — dryRun mode: duplicate found, action not yet taken
export type PageStatus = "kept" | "archived" | "deleted" | "skipped" | "retry" | "error" | "pending";

// Overall phase of the dedup session:
//   running — stream is open and pages are being processed
//   paused  — user paused, or stream was restored from localStorage after a reload
//   done    — all pages scanned and all actions completed
//   error   — a fatal error stopped the session
//   preview — dryRun mode complete, user is reviewing results before confirming
export type Phase = "running" | "paused" | "done" | "error" | "preview";

// Page shape used by DeduplicateView (manual streaming dedup).
export interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

// A group of pages that share the same dedup field value.
export interface DuplicateGroup {
  value: string;
  pages: Page[];
}

// Table row shape used by DedupGroupsList / DuplicateGroupTable.
// Kept intentionally loose (extends Record<string, unknown>) to satisfy the
// Table component's row type contract without requiring a full interface.
export interface DedupeTableRow extends Record<string, unknown> {
  title: { _pageId: string; _title: string };
  created_time: string;
  action: null;
  _pageId: string;
  _isKept: boolean;
  _isExcluded: boolean;
}

export interface PageRow {
  id: string;
  title: string;
  fieldValue: string;
  status: PageStatus;
}

export interface Stats {
  scanned: number;
  duplicatesFound: number;
  actioned: number;
  errors: number;
  retrying: number;
}

export interface LogEntry {
  /** Milliseconds elapsed since the dedup session started — used for relative timestamps in the UI. */
  ts: number;
  /** Absolute Unix timestamp in ms — used when exporting the log to a file. */
  absTs: number;
  type: string;
  level: "info" | "warn" | "error";
  message: string;
  /** Full raw NDJSON event object from the streaming API — preserved so the user
   *  can export a detailed log for debugging or auditing purposes. */
  raw: Record<string, unknown>;
}
