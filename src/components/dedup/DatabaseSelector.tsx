// DatabaseSelector.tsx
//
// Top-level client component for the /duplicate page. Owns all pre-run
// configuration state and renders ConfigRow, DatabasePreviewTable, and
// AutoDeduplicateView. The dedup pipeline is entirely client-side.

"use client";

import { useCallback, useState } from "react";
import type { NotionDatabase } from "@/lib/notion";
import AutoDeduplicateView from "./AutoDeduplicateView";
import { ConfigRow } from "@/components/config-row/ConfigRow";
import { useDatabasePreview } from "./useDatabasePreview";
import { DatabasePreviewTable } from "./DatabasePreviewTable";
import "./DatabaseSelector.css";

interface DatabaseSelectorProps {
  databases: NotionDatabase[];
  token: string;
}

export default function DatabaseSelector({ databases, token }: DatabaseSelectorProps) {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState(databases[0]?.id ?? "");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [autoActionMode, setAutoActionMode] = useState<"archive" | "delete">("archive");
  const [autoExecutionMode, setAutoExecutionMode] = useState<"magically" | "manually">("magically");
  const [autoTiming, setAutoTiming] = useState<"now" | "later">("now");
  const [autoStarted, setAutoStarted] = useState(false);
  const [dryRunConfirmed, setDryRunConfirmed] = useState(false);
  const [skipEmpty, setSkipEmpty] = useState<"skip" | "allow">("skip");
  const [isRunning, setIsRunning] = useState(false);

  const {
    properties,
    previewPages,
    previewHasMore,
    dbTotalCount,
    schemaLoading,
    previewLoading,
    error,
  } = useDatabasePreview({ token, databaseId: selectedDatabaseId });

  const handleDatabaseSelect = useCallback((databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setSelectedProperty("");
    setAutoStarted(false);
    setDryRunConfirmed(false);
    setIsRunning(false);
  }, []);

  const handlePropertySelect = useCallback(
    (propertyName: string) => {
      if (!propertyName || !selectedDatabaseId) return;
      setSelectedProperty(propertyName);
      setAutoStarted(false);
      setDryRunConfirmed(false);
    },
    [selectedDatabaseId]
  );

  const handleSkipEmptyChange = useCallback((value: "skip" | "allow") => {
    setSkipEmpty(value);
    setAutoStarted(false);
    setDryRunConfirmed(false);
  }, []);

  const handleStart = useCallback(() => {
    setAutoStarted(true);
    setIsRunning(true);
  }, []);

  const selectedDb = databases.find((db) => db.id === selectedDatabaseId);

  return (
    <div className="db-layout">
      {error && <div className="db-error">{error}</div>}

      <ConfigRow
        databases={databases}
        selectedDatabaseId={selectedDatabaseId}
        onDatabaseSelect={handleDatabaseSelect}
        properties={properties}
        selectedProperty={selectedProperty}
        onPropertySelect={handlePropertySelect}
        schemaLoading={schemaLoading}
        autoActionMode={autoActionMode}
        onActionModeChange={setAutoActionMode}
        autoExecutionMode={autoExecutionMode}
        onExecutionModeChange={setAutoExecutionMode}
        autoTiming={autoTiming}
        onTimingChange={setAutoTiming}
        onStart={handleStart}
        skipEmpty={skipEmpty}
        scanRowCount={dbTotalCount}
        onSkipEmptyChange={handleSkipEmptyChange}
        isRunning={isRunning}
      />

      {!autoStarted && selectedDatabaseId && (
        <DatabasePreviewTable
          properties={properties}
          previewPages={previewPages}
          previewLoading={previewLoading}
          previewHasMore={previewHasMore}
          selectedProperty={selectedProperty}
        />
      )}

      {autoStarted && (
        <AutoDeduplicateView
          key={dryRunConfirmed ? "real-run" : "dry-run"}
          databaseId={selectedDatabaseId}
          databaseName={selectedDb?.title[0]?.plain_text ?? "Untitled database"}
          fieldName={selectedProperty}
          mode={autoActionMode}
          skipEmpty={skipEmpty === "skip"}
          dryRun={autoTiming === "later" && !dryRunConfirmed}
          onConfirm={() => setDryRunConfirmed(true)}
          onPhaseChange={(p) => setIsRunning(p === "running" || p === "paused")}
          onReset={() => {
            setAutoStarted(false);
            setDryRunConfirmed(false);
            setIsRunning(false);
          }}
          token={token}
        />
      )}
    </div>
  );
}
