// AutoDedupNotices.tsx
// Queue and error notices

"use client";

interface AutoDedupNoticesProps {
  phase: string;
  dryRun: boolean;
  stats: { duplicatesFound: number; errors: number };
}

export function AutoDedupNotices({ phase, dryRun, stats }: AutoDedupNoticesProps) {
  return (
    <>
      {(phase === "running" || phase === "paused") && !dryRun && stats.duplicatesFound > 0 && (
        <div className="auto-queue-notice auto-queue-notice--info">
          <span className="auto-queue-notice__icon">⏳</span>
          <span>
            Deletions are queued due to Notion API limits — pages are removed one at a time.
            First-attempt failures are retried automatically once.
          </span>
        </div>
      )}

      {phase === "done" && stats.errors > 0 && (
        <div className="auto-queue-notice auto-queue-notice--warn">
          <span className="auto-queue-notice__icon">⚠️</span>
          <div>
            <strong>{stats.errors} {stats.errors === 1 ? "page" : "pages"} could not be deleted after 2 attempts.</strong>
            <span> Open each page marked <em>failed</em> in the table below and delete it manually in Notion, or re-run the scan.</span>
          </div>
        </div>
      )}
    </>
  );
}
