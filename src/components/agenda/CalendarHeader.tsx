// CalendarHeader.tsx
// Navigation header with mode selector and date navigation

"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface CalendarHeaderProps {
  calendarMode: "month" | "week" | "day";
  headerLabel: string;
  onModeChange: (m: "month" | "week" | "day") => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  calendarMode,
  headerLabel,
  onModeChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="calendar-view__header">
      <Calendar size={20} className="calendar-view__header-icon" />
      <h2>Calendar</h2>
      <div className="calendar-view__controls">
        <div className="calendar-view__mode-group">
          {(["month", "week", "day"] as const).map((m) => (
            <button
              key={m}
              className={`calendar-view__mode-btn ${calendarMode === m ? "calendar-view__mode-btn--active" : ""}`}
              onClick={() => onModeChange(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <button className="calendar-view__nav-btn" onClick={onPrev}><ChevronLeft size={16} /></button>
        <button className="calendar-view__today-btn" onClick={onToday}>Today</button>
        <button className="calendar-view__nav-btn" onClick={onNext}><ChevronRight size={16} /></button>
        <span className="calendar-view__label">{headerLabel}</span>
      </div>
    </div>
  );
}
