// DedupEmptyView.tsx — S6 empty / "all clean" state
// Shown when dedup scan completes and zero duplicates were found.

"use client";

import type { Stats } from "./dedup-types";
import { Button } from "@/components/ui";
import "./DedupEmptyView.css";

interface DedupEmptyViewProps {
  stats: Stats;
  fieldName: string;
  databaseName: string;
  onChangeDatabase: () => void;
}

export function DedupEmptyView({
  stats,
  fieldName,
  databaseName,
  onChangeDatabase,
}: DedupEmptyViewProps) {
  return (
    <div className="dev-wrapper">
      <div className="dev-icon">∅</div>
      <h1 className="dev-title">All clean.</h1>
      <p className="dev-desc">
        No duplicate <strong>{fieldName.toLowerCase()}</strong> values found in{" "}
        <strong>{databaseName}</strong>.
      </p>
      <p className="dev-stats">
        scanned {stats.scanned} pages · {stats.scanned} unique values · 0 groups
      </p>
      <div className="dev-actions">
        <Button variant="ghost" onClick={onChangeDatabase}>
          Change database
        </Button>
      </div>
    </div>
  );
}
