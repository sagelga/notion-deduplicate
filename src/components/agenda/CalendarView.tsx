// CalendarView.tsx
// Month, week, and day calendar views

"use client";

import { useMemo, useCallback, useState } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import type { AgendaTask } from "./agenda-types";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import TaskCard from "./TaskCard";
import TaskDetailSheet from "./TaskDetailSheet";
import "./CalendarView.css";

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

  // 6-week grid covering the current month
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

  const header = (
    <div className="calendar-view__header">
      <Calendar size={20} className="calendar-view__header-icon" />
      <h2>Calendar</h2>
      <div className="calendar-view__controls">
        <div className="calendar-view__mode-group">
          {(["month", "week", "day"] as const).map((m) => (
            <button
              key={m}
              className={`calendar-view__mode-btn ${calendarMode === m ? "calendar-view__mode-btn--active" : ""}`}
              onClick={() => setCalendarMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <button className="calendar-view__nav-btn" onClick={navigatePrev}><ChevronLeft size={16} /></button>
        <button className="calendar-view__today-btn" onClick={navigateToday}>Today</button>
        <button className="calendar-view__nav-btn" onClick={navigateNext}><ChevronRight size={16} /></button>
        <span className="calendar-view__label">{headerLabel}</span>
      </div>
    </div>
  );

  // ── Month view ────────────────────────────────────────────────────────────────
  if (calendarMode === "month") {
    const currentMonth = focusedDate.getMonth();
    const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div className="calendar-view">
        {header}
        <div className="calendar-view__month">
          <div className="calendar-view__month-header">
            {DAY_NAMES.map((d) => (
              <div key={d} className="calendar-view__month-day-name">{d}</div>
            ))}
          </div>
          <div className="calendar-view__month-grid">
            {monthGrid.map((d, i) => {
              const dateStr = d.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const isCurrentMonth = d.getMonth() === currentMonth;
              const dayTasks = getTasksForDate(d);

              return (
                <div
                  key={i}
                  className={[
                    "calendar-view__month-cell",
                    isToday ? "calendar-view__month-cell--today" : "",
                    !isCurrentMonth ? "calendar-view__month-cell--other" : "",
                  ].join(" ")}
                  onClick={() => { setCalendarDate(dateStr); setCalendarMode("day"); }}
                >
                  <span className="calendar-view__month-cell-num">{d.getDate()}</span>
                  <div className="calendar-view__month-cell-tasks">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={[
                          "calendar-view__month-task",
                          task.done ? "calendar-view__month-task--done" : "",
                          task.priority ? `calendar-view__month-task--${task.priority}` : "",
                        ].join(" ")}
                        onClick={(e) => { e.stopPropagation(); handleOpenDetail(task); }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="calendar-view__month-more">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
      </div>
    );
  }

  // ── Week view ─────────────────────────────────────────────────────────────────
  if (calendarMode === "week") {
    return (
      <div className="calendar-view">
        {header}
        <div className="calendar-view__week">
          <div className="calendar-view__day-headers">
            {weekDates.map((d, i) => {
              const dateStr = d.toISOString().split("T")[0];
              const isToday = dateStr === today;
              return (
                <div key={i} className={`calendar-view__day-header ${isToday ? "calendar-view__day-header--today" : ""}`}>
                  <span className="calendar-view__day-name">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="calendar-view__day-num">{d.getDate()}</span>
                </div>
              );
            })}
          </div>
          <div className="calendar-view__week-body">
            {weekDates.map((d, i) => {
              const dateStr = d.toISOString().split("T")[0];
              const isToday = dateStr === today;
              const dayTasks = getTasksForDate(d);
              return (
                <div key={i} className={`calendar-view__day-column ${isToday ? "calendar-view__day-column--today" : ""}`}>
                  {dayTasks.length === 0 ? (
                    <div className="calendar-view__day-empty" />
                  ) : (
                    dayTasks.map((task) => (
                      <div key={task.id} className={`calendar-view__task-block ${task.done ? "calendar-view__task-block--done" : ""}`} onClick={() => handleOpenDetail(task)}>
                        {task.dueTime && <span className="calendar-view__task-time">{task.dueTime}</span>}
                        <span className="calendar-view__task-title">{task.title}</span>
                        {task.priority && <span className={`calendar-view__task-priority calendar-view__task-priority--${task.priority}`} />}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
      </div>
    );
  }

  // ── Day view ──────────────────────────────────────────────────────────────────
  const dayTasks = getTasksForDate(focusedDate);

  return (
    <div className="calendar-view">
      {header}
      <div className="calendar-view__day-view">
        {dayTasks.length === 0 ? (
          <div className="calendar-view__day-view-empty">No tasks for this day.</div>
        ) : (
          <div className="calendar-view__day-view-tasks">
            {dayTasks.map((task) => <TaskCard key={task.id} task={task} onOpenDetail={handleOpenDetail} />)}
          </div>
        )}
      </div>
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
    </div>
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
