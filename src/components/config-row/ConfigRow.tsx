// ConfigRow.tsx
//
// The sentence-style configuration bar rendered at the top of the duplicate page:
//   "Deduplicate [database] using [field] by [archiving|deleting] [magically|manually] [now|later] ✓"
//
// Each bracketed slot is a ConfigRowDropdown inline within the sentence. The ✓ button
// starts the run. Dropdowns for field, action, execution mode, and timing are
// disabled until a database (and therefore a schema) is available.
//
// Static option arrays are defined at module level (not inside the component) so
// they're not re-created on every render. Database and property options are built
// dynamically from props since they depend on the API response.

"use client";

import { type NotionDatabase, type NotionProperty } from "@/lib/notion";
import { ConfigRowDropdown, type ConfigRowDropdownOption } from "./ConfigRowDropdown";

interface ConfigRowProps {
  databases: NotionDatabase[];
  selectedDatabaseId: string;
  onDatabaseSelect: (id: string) => void;
  properties: NotionProperty[];
  selectedProperty: string;
  onPropertySelect: (name: string) => void;
  schemaLoading: boolean;
  autoActionMode: "archive" | "delete";
  onActionModeChange: (mode: "archive" | "delete") => void;
  autoExecutionMode: "magically" | "manually";
  onExecutionModeChange: (mode: "magically" | "manually") => void;
  autoTiming: "now" | "later";
  onTimingChange: (timing: "now" | "later") => void;
  onStart: () => void;
  skipEmpty: "skip" | "allow";
  onSkipEmptyChange: (value: "skip" | "allow") => void;
  isRunning?: boolean;
  /** Estimated row count shown in the Scan button label, e.g. "248 rows" */
  scanRowCount?: number;
}

// Maps Notion API property type strings to their human-readable names and
// icons matching the Notion UI. Used to annotate the field dropdown options.
const NOTION_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  title:            { label: "Title",            icon: "Aa" },
  rich_text:        { label: "Text",             icon: "T"  },
  number:           { label: "Number",           icon: "#"  },
  select:           { label: "Select",           icon: "⊙"  },
  multi_select:     { label: "Multi-select",     icon: "⊕"  },
  status:           { label: "Status",           icon: "◎"  },
  date:             { label: "Date",             icon: "📅" },
  people:           { label: "Person",           icon: "👤" },
  files:            { label: "Files & media",    icon: "📎" },
  checkbox:         { label: "Checkbox",         icon: "☑"  },
  url:              { label: "URL",              icon: "🔗" },
  email:            { label: "Email",            icon: "@"  },
  phone_number:     { label: "Phone",            icon: "📞" },
  formula:          { label: "Formula",          icon: "Σ"  },
  relation:         { label: "Relation",         icon: "↗"  },
  rollup:           { label: "Rollup",           icon: "⟲"  },
  created_time:     { label: "Created time",     icon: "🕐" },
  created_by:       { label: "Created by",       icon: "👤" },
  last_edited_time: { label: "Last edited time", icon: "🕐" },
  last_edited_by:   { label: "Last edited by",   icon: "👤" },
  button:           { label: "Button",           icon: "⊞"  },
  unique_id:        { label: "ID",               icon: "#"  },
};

const ACTION_MODE_OPTIONS: ConfigRowDropdownOption[] = [
  {
    value: "archive",
    label: "archiving",
    description: "Move to trash, recoverable for 30 days",
  },
  {
    value: "delete",
    label: "deleting",
    description: "Permanently remove with no recovery",
  },
];

const EXECUTION_MODE_OPTIONS: ConfigRowDropdownOption[] = [
  {
    value: "magically",
    label: "automatically",
    description: "Auto-detect & remove duplicates automatically",
  },
  {
    value: "manually",
    label: "manually",
    description: "Review duplicates before removing",
    disabled: true,
  },
];

const SKIP_EMPTY_OPTIONS: ConfigRowDropdownOption[] = [
  {
    value: "skip",
    label: "skipping empty",
    description: "Ignore pages where the field is blank",
  },
  {
    value: "allow",
    label: "allowing empty",
    description: "Treat blank values as duplicates of each other",
  },
];

const TIMING_OPTIONS: ConfigRowDropdownOption[] = [
  {
    value: "now",
    label: "now",
    description: "Execute immediately without preview",
  },
  {
    value: "later",
    label: "later",
    description: "Show preview first, then confirm action",
  },
];

export function ConfigRow({
  databases,
  selectedDatabaseId,
  onDatabaseSelect,
  properties,
  selectedProperty,
  onPropertySelect,
  schemaLoading,
  autoActionMode,
  onActionModeChange,
  autoExecutionMode,
  onExecutionModeChange,
  autoTiming,
  onTimingChange,
  onStart,
  skipEmpty,
  onSkipEmptyChange,
  isRunning = false,
  scanRowCount,
}: ConfigRowProps) {
  const databaseOptions: ConfigRowDropdownOption[] = databases.map((db) => ({
    value: db.id,
    label: db.title[0]?.plain_text || "(Untitled)",
  }));

  const propertyOptions: ConfigRowDropdownOption[] = properties.map((prop) => {
    const mapped = NOTION_TYPE_MAP[prop.type];
    return {
      value: prop.name,
      label: prop.name,
      description: mapped ? `${mapped.icon} ${mapped.label}` : prop.type,
    };
  });

  return (
    <div className="db-config-row">
      <span className="db-config-text">{isRunning ? "Duplicating" : "I want to deduplicate"}</span>

      <ConfigRowDropdown
        value={selectedDatabaseId}
        onChange={onDatabaseSelect}
        options={databaseOptions}
        disabled={isRunning}
        inline
      />

      {schemaLoading ? (
        <div className="db-spinner db-spinner--sm" />
      ) : (
        <>
          <span className="db-config-text">using</span>
          <ConfigRowDropdown
            value={selectedProperty}
            onChange={onPropertySelect}
            options={propertyOptions}
            disabled={!selectedDatabaseId || isRunning}
            inline
          />

          <span className="db-config-text">by</span>

          <ConfigRowDropdown
            value={autoActionMode}
            onChange={(value) => onActionModeChange(value as "archive" | "delete")}
            options={ACTION_MODE_OPTIONS}
            disabled={!selectedProperty || isRunning}
            inline
          />

          <ConfigRowDropdown
            value={autoExecutionMode}
            onChange={(value) => onExecutionModeChange(value as "magically" | "manually")}
            options={EXECUTION_MODE_OPTIONS}
            disabled={!selectedProperty || isRunning}
            inline
          />

          <ConfigRowDropdown
            value={autoTiming}
            onChange={(value) => onTimingChange(value as "now" | "later")}
            options={TIMING_OPTIONS}
            disabled={!selectedProperty || isRunning}
            inline
          />

          {selectedProperty && (
            <>
              <span className="db-config-text">,</span>
              <ConfigRowDropdown
                value={skipEmpty}
                onChange={(value) => onSkipEmptyChange(value as "skip" | "allow")}
                options={SKIP_EMPTY_OPTIONS}
                disabled={isRunning}
                inline
              />
            </>
          )}

          {!isRunning && (
            <button
              onClick={onStart}
              className="db-config-checkmark"
              disabled={!selectedDatabaseId || !selectedProperty}
              title="Start deduplication process"
            >
              {scanRowCount != null ? `Scan ${scanRowCount} rows →` : "Scan →"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
