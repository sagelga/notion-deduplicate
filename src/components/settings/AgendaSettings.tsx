// AgendaSettings.tsx
//
// Settings section for the Agenda feature within /settings.
// Shows a database-selection prompt if none is chosen, otherwise
// renders all Agenda configuration options.

"use client";

import React from "react";
import Link from "next/link";
import { useAgendaSettings } from "./useAgendaSettings";
import { useNotionToken } from "@/hooks/useNotionToken";
import PropertyMappingSection from "./PropertyMappingSection";
import CalendarSettingsSection from "./CalendarSettingsSection";
import QuickAddDefaultsSection from "./QuickAddDefaultsSection";
import DatabaseSelector from "./DatabaseSelector";
import type { AgendaView } from "@/components/agenda/agenda-types";
import "./AgendaSettings.css";

export default function AgendaSettings() {
  const { token } = useNotionToken();
  const {
    selectedDatabaseId,
    databases,
    schema,
    isLoadingDbs,
    savedMapping,
    detectedMapping,
    defaultView,
    calendarStartDay,
    calendarDefaultMode,
    dateFormat,
    quickAddPriority,
    quickAddLabels,
    setDefaultView,
    setCalendarStartDay,
    setCalendarDefaultMode,
    setDateFormat,
    setQuickAddPriority,
    setQuickAddLabels,
    handleDatabaseChange,
    handleMappingChange,
  } = useAgendaSettings();

  if (!token) {
    return (
      <div className="agenda-token-notice">
        <p>
          A Notion integration token is required to load your databases.{" "}
          <Link href="/settings#connection">Set up your connection</Link> first.
        </p>
      </div>
    );
  }

  if (!selectedDatabaseId) {
    return (
      <div className="agenda-settings">
        <DatabaseSelector
          databases={databases}
          selectedDatabaseId={null}
          isLoading={isLoadingDbs}
          onChange={handleDatabaseChange}
          description="Select the Notion database you want to use for tasks. Make sure it contains a &quot;Name&quot; property."
        />
      </div>
    );
  }

  return (
    <div className="agenda-settings">
      <DatabaseSelector
        databases={databases}
        selectedDatabaseId={selectedDatabaseId}
        isLoading={isLoadingDbs}
        onChange={handleDatabaseChange}
      />

      <PropertyMappingSection
        savedMapping={savedMapping}
        detectedMapping={detectedMapping}
        schema={schema}
        onChange={handleMappingChange}
      />

      <p className="agenda-settings-subtitle">Default View</p>
      <div className="agenda-view-options">
        {(["today", "inbox", "upcoming", "calendar"] as AgendaView[]).map((v) => (
          <button
            key={v}
            type="button"
            className={`agenda-view-btn${defaultView === v ? " active" : ""}`}
            onClick={() => setDefaultView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <CalendarSettingsSection
        calendarStartDay={calendarStartDay}
        calendarDefaultMode={calendarDefaultMode}
        dateFormat={dateFormat}
        onStartDayChange={setCalendarStartDay}
        onDefaultModeChange={setCalendarDefaultMode}
        onDateFormatChange={setDateFormat}
      />

      <QuickAddDefaultsSection
        quickAddPriority={quickAddPriority}
        quickAddLabels={quickAddLabels}
        onPriorityChange={setQuickAddPriority}
        onLabelsChange={setQuickAddLabels}
      />
    </div>
  );
}