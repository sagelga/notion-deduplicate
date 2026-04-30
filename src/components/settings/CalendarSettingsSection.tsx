// CalendarSettingsSection.tsx
// Calendar configuration UI for Agenda settings

"use client";

import React from "react";

interface CalendarSettingsSectionProps {
  calendarStartDay: string;
  calendarDefaultMode: string;
  dateFormat: string;
  onStartDayChange: (value: string) => void;
  onDefaultModeChange: (value: string) => void;
  onDateFormatChange: (value: string) => void;
}

export default function CalendarSettingsSection({
  calendarStartDay,
  calendarDefaultMode,
  dateFormat,
  onStartDayChange,
  onDefaultModeChange,
  onDateFormatChange,
}: CalendarSettingsSectionProps) {
  return (
    <>
      <p className="agenda-settings-subtitle">Calendar</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="agenda-prop-row" style={{ paddingBottom: "0" }}>
          <label className="agenda-prop-label" htmlFor="cal-start-day">Start week on</label>
          <select
            id="cal-start-day"
            className="agenda-prop-select"
            value={calendarStartDay}
            onChange={(e) => onStartDayChange(e.target.value)}
          >
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>
        <div className="agenda-prop-row" style={{ paddingTop: "0", paddingBottom: "0" }}>
          <label className="agenda-prop-label" htmlFor="cal-default-mode">Default mode</label>
          <select
            id="cal-default-mode"
            className="agenda-prop-select"
            value={calendarDefaultMode}
            onChange={(e) => onDefaultModeChange(e.target.value)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div className="agenda-prop-row" style={{ paddingTop: "0" }}>
          <label className="agenda-prop-label" htmlFor="date-format">Date format</label>
          <select
            id="date-format"
            className="agenda-prop-select"
            value={dateFormat}
            onChange={(e) => onDateFormatChange(e.target.value)}
          >
            <option value="system">System default</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </>
  );
}