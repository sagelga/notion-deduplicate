// DatabaseSelector.tsx
// Database selector for Agenda settings

"use client";

import React from "react";
import type { NotionDatabase } from "@/lib/notion";

interface DatabaseSelectorProps {
  databases: NotionDatabase[];
  selectedDatabaseId: string | null;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  label?: string;
  description?: string;
}

export default function DatabaseSelector({
  databases,
  selectedDatabaseId,
  isLoading,
  onChange,
  label = "Notion Task Database",
  description,
}: DatabaseSelectorProps) {
  return (
    <div className="agenda-db-selector">
      <label className="agenda-db-selector-label" htmlFor="agenda-db-select">
        {label}
      </label>
      {description && <p className="agenda-db-selector-desc">{description}</p>}
      <select
        id="agenda-db-select"
        className="agenda-prop-select"
        value={selectedDatabaseId ?? ""}
        onChange={onChange}
      >
        <option value="">— Select a database —</option>
        {databases.map((db) => (
          <option key={db.id} value={db.id}>
            {db.title?.[0]?.plain_text ?? db.id}
          </option>
        ))}
      </select>
      {isLoading && (
        <p className="agenda-db-selector-desc" style={{ marginTop: "0.5rem" }}>
          Loading databases…
        </p>
      )}
    </div>
  );
}