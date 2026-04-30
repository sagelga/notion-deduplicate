// DatabasePreviewTable.tsx
//
// Read-only paginated preview table showing sample pages from the selected Notion database
// before deduplication. Uses the generic Table component with preview-specific configuration.
//
// The currently selected dedup field column is visually highlighted so the user
// can judge the data quality of the field they chose.

"use client";

import { type NotionProperty } from "@/lib/notion";
import { Table, type TableColumn } from "./table/Table";
import { CellValue } from "./table/CellValue";

export interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

const PREVIEW_PAGE_SIZE = 20;

interface DatabasePreviewTableProps {
  previewLoading: boolean;
  previewPages: Page[];
  previewHasMore: boolean;
  previewColumns: NotionProperty[];
  selectedProperty: string;
}

export function DatabasePreviewTable({
  previewLoading,
  previewPages,
  previewHasMore,
  previewColumns,
  selectedProperty,
}: DatabasePreviewTableProps) {
  const columns: TableColumn[] = [
    {
      key: "title",
      label: "Title"
    },
    ...previewColumns.map((col) => ({
      key: col.name,
      label: col.name,
      format: (value: unknown) => <CellValue value={value as string | null} />
    }))
  ];

  const rows = previewPages.map((page) => ({
    id: page.id,
    title: page.title,
    ...page.properties
  }));

  return (
    <Table
      columns={columns}
      rows={rows}
      loading={previewLoading}
      skeletonRows={5}
      pageSize={PREVIEW_PAGE_SIZE}
      activeColumn={selectedProperty}
      hasMore={previewHasMore}
      cardHeader={{
        label: "Preview",
        showRowCount: true,
        showSpinner: true
      }}
      rowKey={(row) => String(row.id)}
      className="db-preview"
      striped={true}
      hoverable={true}
    />
  );
}
