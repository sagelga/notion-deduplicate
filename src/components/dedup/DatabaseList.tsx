// DatabaseList.tsx
//
// Renders the scrollable list of databases inside the ConfigRowDropdown panel.
// Each item shows the database title and is selectable via onSelect.

import { type NotionDatabase } from "@/lib/notion";
import { DatabaseSearch } from "./DatabaseSearch";
import { useState, useMemo } from "react";

interface DatabaseListProps {
  databases: NotionDatabase[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function DatabaseList({ databases, selectedId, onSelect }: DatabaseListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return databases;
    const q = search.toLowerCase();
    return databases.filter((db) =>
      db.title[0]?.plain_text?.toLowerCase().includes(q)
    );
  }, [databases, search]);

  return (
    <div className="db-list">
      <DatabaseSearch value={search} onChange={setSearch} placeholder="Search databases…" />
      <div className="db-list-items">
        {filtered.length === 0 ? (
          <div className="db-list-empty">No databases found</div>
        ) : (
          filtered.map((db) => (
            <DatabaseListItem
              key={db.id}
              database={db}
              isSelected={db.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface DatabaseListItemProps {
  database: NotionDatabase;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function DatabaseListItem({ database, isSelected, onSelect }: DatabaseListItemProps) {
  const title = database.title[0]?.plain_text || "(Untitled)";
  return (
    <button
      className={`db-list-item${isSelected ? " db-list-item--selected" : ""}`}
      onClick={() => onSelect(database.id)}
      type="button"
    >
      <span className="db-list-item-title">{title}</span>
    </button>
  );
}