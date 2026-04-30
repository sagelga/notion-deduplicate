// DatabasePreviewTable.tsx
//
// Read-only sample of the selected database shown before a dedup run starts.
// Displays up to 20 rows with the selected dedup field highlighted.

import { useMemo } from "react";
import { Table, type TableColumn } from "@/components/table/Table";
import type { NotionProperty } from "@/lib/notion";
import { DEDUPLICATABLE_TYPES } from "./useDatabasePreview";
import type { PreviewPage } from "./useDatabasePreview";
import "./DatabasePreviewTable.css";

interface DatabasePreviewTableProps {
  properties: NotionProperty[];
  previewPages: PreviewPage[];
  previewLoading: boolean;
  previewHasMore: boolean;
  selectedProperty: string;
}

export function DatabasePreviewTable({
  properties,
  previewPages,
  previewLoading,
  previewHasMore,
  selectedProperty,
}: DatabasePreviewTableProps) {
  const previewColumns = useMemo(
    () =>
      properties
        .filter((p) => DEDUPLICATABLE_TYPES.has(p.type))
        .sort((a, b) => {
          if (a.name === selectedProperty) return -1;
          if (b.name === selectedProperty) return 1;
          return 0;
        }),
    [properties, selectedProperty]
  );

  const tableRows = useMemo(
    () =>
      previewPages.map((page) => ({
        id: page.id,
        title: page.title,
        ...page.properties,
      })),
    [previewPages]
  );

  const tableColumns = useMemo<TableColumn[]>(() => {
    const cols: TableColumn[] = [
      { key: "title", label: "Title" },
      ...previewColumns.map((col) => ({
        key: col.name,
        label: col.name,
      })),
    ];
    return cols;
  }, [previewColumns]);

  return (
    <div className="db-main-content">
      <Table
        columns={tableColumns}
        rows={tableRows}
        loading={previewLoading}
        hasMore={previewHasMore}
        pageSize={20}
        activeColumn={selectedProperty || "title"}
        cardHeader={{
          label: "Preview",
          showRowCount: true,
          showSpinner: true,
        }}
        rowKey={(row) => (row.id as string) || (row.title as string)}
        skeletonRows={5}
      />
    </div>
  );
}