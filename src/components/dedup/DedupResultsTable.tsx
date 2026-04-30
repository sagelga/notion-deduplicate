// DedupResultsTable.tsx
//
// Paginated table of all page rows processed during a deduplication run. Each row
// shows the page's status badge, the dedup field value, and a link to the page in
// Notion.
//
// Visibility rules:
// - Hidden entirely while rows are empty (nothing to show yet).
// - Also hidden during a dry-run scan (dryRun && phase === "running") so the
//   results appear atomically after the scan completes rather than trickling in.
// - The "reveal" CSS class is added when entering preview mode so an animation
//   can make the rows appear all at once.

"use client";

import type { ReactNode } from "react";
import { Table, type TableColumn } from "@/components/table/Table";
import { CellValue } from "@/components/table/CellValue";
import { Badge, type BadgeVariant } from "@/components/ui";
import type { PageRow, Phase } from "./dedup-types";

const PAGE_SIZE = 20;

function notionPageUrl(id: string) {
  return `https://www.notion.so/${id.replace(/-/g, "")}`;
}

interface DedupResultsTableProps {
  rows: PageRow[];
  fieldName: string;
  dryRun: boolean;
  phase: Phase;
}

export function DedupResultsTable({ rows, fieldName, dryRun, phase }: DedupResultsTableProps) {
  if (rows.length === 0 || (dryRun && phase === "running")) return null;

  const columns: TableColumn[] = [
    {
      key: "status",
      label: "Status",
      width: "120px",
      format: (value): ReactNode => {
        const status = value as string;
        return (
          <Badge variant={status as BadgeVariant}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: "fieldValue",
      label: fieldName,
      format: (value): ReactNode => <CellValue value={value as string} />,
    },
    {
      key: "title",
      label: "Title",
      format: (value, row): ReactNode => {
        const id = ((row as unknown as Record<string, unknown>)?.id as string) || "";
        const title = value as string;
        return (
          <a
            href={notionPageUrl(id)}
            target="_blank"
            rel="noopener noreferrer"
            className="auto-page-link"
          >
            {title}
          </a>
        );
      },
    },
  ];

  const tableRows = rows.map((row) => ({
    id: row.id,
    status: row.status,
    fieldValue: row.fieldValue,
    title: row.title,
  })) as Record<string, unknown>[];

  return (
    <div className={`auto-table-wrap${dryRun && phase === "preview" ? " auto-table-wrap--reveal" : ""}`}>
      <Table
        columns={columns}
        rows={tableRows}
        rowKey={(row) => (row as unknown as PageRow).id}
        pageSize={PAGE_SIZE}
        className="auto-table"
      />
    </div>
  );
}
