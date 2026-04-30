// CalendarMonthView.tsx
// Month grid calendar view

"use client";

import type { AgendaTask } from "./agenda-types";
import TaskDetailSheet from "./TaskDetailSheet";

interface CalendarMonthViewProps {
  monthGrid: Date[];
  focusedDate: Date;
  today: string;
  getTasksForDate: (date: Date) => AgendaTask[];
  onTaskClick: (task: AgendaTask) => void;
  selectedTask: AgendaTask | null;
  onCloseDetail: () => void;
  setCalendarDate: (d: string) => void;
  setCalendarMode: (m: "day") => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonthView({
  monthGrid,
  focusedDate,
  today,
  getTasksForDate,
  onTaskClick,
  selectedTask,
  onCloseDetail,
  setCalendarDate,
  setCalendarMode,
}: CalendarMonthViewProps) {
  const currentMonth = focusedDate.getMonth();

  return (
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
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
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
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={onCloseDetail} />}
    </div>
  );
}
