import type { ReactNode } from "react";
import type { DuplicateGroup, DedupeTableRow } from "./dedup-types";
import { Table, type TableColumn } from "@/components/table/Table";

interface DuplicateGroupTableProps {
  group: DuplicateGroup;
  keepId: string;
  userSelected: boolean;
  excludedIds: Set<string>;
  onKeepChange: (group: DuplicateGroup, pageId: string) => void;
  onExcludeToggle: (pageId: string, excluded: boolean) => void;
}

function notionPageUrl(id: string) {
  return `https://www.notion.so/${id.replace(/-/g, "")}`;
}

export function DuplicateGroupTable({
  group,
  keepId,
  userSelected,
  excludedIds,
  onKeepChange,
  onExcludeToggle,
}: DuplicateGroupTableProps): ReactNode {
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
                onChange={() => onKeepChange(group, dedupeRow._pageId)}
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
                  onExcludeToggle(dedupeRow._pageId, !e.target.checked)
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
}
