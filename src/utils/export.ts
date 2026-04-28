import type { LogEntry, Mode, Stats } from "@/components/dedup-types";

interface ExportSession {
  databaseId: string;
  databaseName: string;
  fieldName: string;
  mode: Mode;
  skipEmpty: boolean;
  dryRun: boolean;
}

export function exportDedupLogs(
  session: ExportSession,
  stats: Stats,
  logs: LogEntry[]
): void {
  const endedAt = new Date().toISOString();
  const firstLog = logs[0];
  const startedAtMs = firstLog?.absTs ?? Date.now();

  const payload = {
    session: {
      ...session,
      startedAt: new Date(startedAtMs).toISOString(),
      endedAt,
      elapsedMs: Date.now() - startedAtMs,
    },
    summary: stats,
    events: logs.map((e) => ({
      ts: e.ts,
      timestamp: new Date(e.absTs).toISOString(),
      type: e.type,
      level: e.level,
      message: e.message,
      raw: e.raw,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = session.databaseName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const date = endedAt.slice(0, 10);
  a.download = `notion-dedup-${safeName}-${date}.json`;
  a.href = blobUrl;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
