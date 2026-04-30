// ConfigRow.tsx
//
// The sentence-style configuration bar rendered at the top of the duplicate page:
//   "Deduplicate [database] using [field] by [archiving|deleting] [magically|manually] [now|later] ✓"
//
// Each bracketed slot is a ConfigRowDropdown inline within the sentence. The ✓ button
// starts the run. Dropdowns for field, action, execution mode, and timing are
// disabled until a database (and therefore a schema) is available.

"use client";

import { type NotionDatabase, type NotionProperty } from "@/lib/notion";
import { ConfigRowSpinner } from "./ConfigRowSpinner";
import { ConfigRowDatabase } from "./ConfigRowDatabase";
import { ConfigRowField } from "./ConfigRowField";
import { ConfigRowControl } from "./ConfigRowControl";

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
  scanRowCount?: number;
}

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
  return (
    <div className="db-config-row">
      <ConfigRowDatabase
        databases={databases}
        selectedDatabaseId={selectedDatabaseId}
        onDatabaseSelect={onDatabaseSelect}
        isRunning={isRunning}
      />

      {schemaLoading ? (
        <ConfigRowSpinner />
      ) : (
        <>
          {properties.length === 0 && selectedDatabaseId ? (
            <span className="db-config-error">
              No supported fields found in this database. Deduplication requires title, text, select, number, email, URL, phone, checkbox, or date fields.
            </span>
          ) : selectedProperty ? (
            <>
              <ConfigRowField
                properties={properties}
                selectedProperty={selectedProperty}
                onPropertySelect={onPropertySelect}
                isRunning={isRunning}
              />

              <ConfigRowControl
                autoActionMode={autoActionMode}
                onActionModeChange={onActionModeChange}
                autoExecutionMode={autoExecutionMode}
                onExecutionModeChange={onExecutionModeChange}
                autoTiming={autoTiming}
                onTimingChange={onTimingChange}
                skipEmpty={skipEmpty}
                onSkipEmptyChange={onSkipEmptyChange}
                isRunning={isRunning}
              />

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
          ) : (
            properties.length > 0 && (
              <ConfigRowField
                properties={properties}
                selectedProperty={selectedProperty}
                onPropertySelect={onPropertySelect}
                isRunning={isRunning}
              />
            )
          )}
        </>
      )}
    </div>
  );
}