// CalendarWeekView.tsx
// Week column calendar view

"use client";

import type { AgendaTask } from "./agenda-types";
import TaskDetailSheet from "./TaskDetailSheet";

interface CalendarWeekViewProps {
  weekDates: Date[];
  today: string;
  getTasksForDate: (date: Date) => AgendaTask[];
  onTaskClick: (task: AgendaTask) => void;
  selectedTask: AgendaTask | null;
  onCloseDetail: () => void;
}

export function CalendarWeekView({
  weekDates,
  today,
  getTasksForDate,
  onTaskClick,
  selectedTask,
  onCloseDetail,
}: CalendarWeekViewProps) {
  return (
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
                  <div key={task.id} className={`calendar-view__task-block ${task.done ? "calendar-view__task-block--done" : ""}`} onClick={() => onTaskClick(task)}>
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
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={onCloseDetail} />}
    </div>
  );
}
