// ConfigRowDatabase.tsx
// Database selector portion of the sentence-style ConfigRow.

import { type NotionDatabase } from "@/lib/notion";
import { ConfigRowDropdown, type ConfigRowDropdownOption } from "./ConfigRowDropdown";
import { ConfigRowLabel } from "./ConfigRowLabel";

interface ConfigRowDatabaseProps {
  databases: NotionDatabase[];
  selectedDatabaseId: string;
  onDatabaseSelect: (id: string) => void;
  isRunning: boolean;
}

export function ConfigRowDatabase({
  databases,
  selectedDatabaseId,
  onDatabaseSelect,
  isRunning,
}: ConfigRowDatabaseProps) {
  const databaseOptions: ConfigRowDropdownOption[] = databases.map((db) => ({
    value: db.id,
    label: db.title[0]?.plain_text || "(Untitled)",
  }));

  return (
    <>
      <ConfigRowLabel text={isRunning ? "Duplicating" : "I want to deduplicate"} />
      <ConfigRowDropdown
        value={selectedDatabaseId}
        onChange={onDatabaseSelect}
        options={databaseOptions}
        disabled={isRunning}
        inline
      />
    </>
  );
}