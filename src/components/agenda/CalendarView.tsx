// CalendarView.tsx
// Month, week, and day calendar views

"use client";

import { useMemo, useCallback, useState } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import type { AgendaTask } from "./agenda-types";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import "./CalendarView.css";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarView() {
  const { tasks, showDone, calendarMode, setCalendarMode, calendarDate, setCalendarDate } = useAgenda();
  const [selectedTask, setSelectedTask] = useState<AgendaTask | null>(null);

  const focusedDate = useMemo(() => new Date(calendarDate + "T00:00:00"), [calendarDate]);

  const weekDates = useMemo(() => {
    const start = getWeekStart(focusedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [focusedDate]);

  const monthGrid = useMemo(() => {
    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = getWeekStart(firstDay);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [focusedDate]);

  const filteredTasks = useMemo(() => tasks.filter((t) => showDone || !t.done), [tasks, showDone]);

  const getTasksForDate = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split("T")[0];
      return filteredTasks.filter((t) => t.dueDate === dateStr);
    },
    [filteredTasks]
  );

  const navigatePrev = useCallback(() => {
    const d = new Date(focusedDate);
    if (calendarMode === "month") d.setMonth(d.getMonth() - 1);
    else if (calendarMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCalendarDate(d.toISOString().split("T")[0]);
  }, [focusedDate, calendarMode, setCalendarDate]);

  const navigateNext = useCallback(() => {
    const d = new Date(focusedDate);
    if (calendarMode === "month") d.setMonth(d.getMonth() + 1);
    else if (calendarMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCalendarDate(d.toISOString().split("T")[0]);
  }, [focusedDate, calendarMode, setCalendarDate]);

  const navigateToday = useCallback(() => setCalendarDate(new Date().toISOString().split("T")[0]), [setCalendarDate]);

  const handleOpenDetail = useCallback((task: AgendaTask) => setSelectedTask(task), []);
  const handleCloseDetail = useCallback(() => setSelectedTask(null), []);

  const today = new Date().toISOString().split("T")[0];

  const headerLabel = useMemo(() => {
    if (calendarMode === "month") {
      return focusedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (calendarMode === "week") {
      return `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return focusedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [calendarMode, focusedDate, weekDates]);

  const dayTasks = getTasksForDate(focusedDate);

  return (
    <div className="calendar-view">
      <CalendarHeader
        calendarMode={calendarMode}
        headerLabel={headerLabel}
        onModeChange={setCalendarMode}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onToday={navigateToday}
      />

      {calendarMode === "month" && (
        <CalendarMonthView
          monthGrid={monthGrid}
          focusedDate={focusedDate}
          today={today}
          getTasksForDate={getTasksForDate}
          onTaskClick={handleOpenDetail}
          selectedTask={selectedTask}
          onCloseDetail={handleCloseDetail}
          setCalendarDate={setCalendarDate}
          setCalendarMode={setCalendarMode}
        />
      )}

      {calendarMode === "week" && (
        <CalendarWeekView
          weekDates={weekDates}
          today={today}
          getTasksForDate={getTasksForDate}
          onTaskClick={handleOpenDetail}
          selectedTask={selectedTask}
          onCloseDetail={handleCloseDetail}
        />
      )}

      {calendarMode === "day" && (
        <CalendarDayView
          tasks={dayTasks}
          onOpenDetail={handleOpenDetail}
          selectedTask={selectedTask}
          onCloseDetail={handleCloseDetail}
        />
      )}
    </div>
  );
}
