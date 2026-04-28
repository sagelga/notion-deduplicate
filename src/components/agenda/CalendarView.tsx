// CalendarView.tsx
// Week and day calendar views

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
    d.setDate(d.getDate() - (calendarMode === "week" ? 7 : 1));
    setCalendarDate(d.toISOString().split("T")[0]);
  }, [focusedDate, calendarMode, setCalendarDate]);

  const navigateNext = useCallback(() => {
    const d = new Date(focusedDate);
    d.setDate(d.getDate() + (calendarMode === "week" ? 7 : 1));
    setCalendarDate(d.toISOString().split("T")[0]);
  }, [focusedDate, calendarMode, setCalendarDate]);

  const navigateToday = useCallback(() => setCalendarDate(new Date().toISOString().split("T")[0]), [setCalendarDate]);

  const handleOpenDetail = useCallback((task: AgendaTask) => setSelectedTask(task), []);
  const handleCloseDetail = useCallback(() => setSelectedTask(null), []);

  const today = new Date().toISOString().split("T")[0];

  const headerLabel =
    calendarMode === "week"
      ? `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : focusedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (calendarMode === "week") {
    return (
      <div className="calendar-view">
        <div className="calendar-view__header">
          <Calendar size={24} />
          <h2>Calendar</h2>
          <div className="calendar-view__controls">
            <button className="calendar-view__mode-toggle" onClick={() => setCalendarMode("day")}>Day</button>
            <button className="calendar-view__nav-btn" onClick={navigatePrev}><ChevronLeft size={16} /></button>
            <button className="calendar-view__today-btn" onClick={navigateToday}>Today</button>
            <button className="calendar-view__nav-btn" onClick={navigateNext}><ChevronRight size={16} /></button>
            <span className="calendar-view__label">{headerLabel}</span>
          </div>
        </div>
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

  const dayTasks = getTasksForDate(focusedDate);

  return (
    <div className="calendar-view">
      <div className="calendar-view__header">
        <Calendar size={24} />
        <h2>Calendar</h2>
        <div className="calendar-view__controls">
          <button className="calendar-view__mode-toggle" onClick={() => setCalendarMode("week")}>Week</button>
          <button className="calendar-view__nav-btn" onClick={navigatePrev}><ChevronLeft size={16} /></button>
          <button className="calendar-view__today-btn" onClick={navigateToday}>Today</button>
          <button className="calendar-view__nav-btn" onClick={navigateNext}><ChevronRight size={16} /></button>
          <span className="calendar-view__label">{headerLabel}</span>
        </div>
      </div>
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
