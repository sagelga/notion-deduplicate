// CalendarDayView.tsx
// Day view showing tasks for a specific date

"use client";

import type { AgendaTask } from "./agenda-types";
import TaskCard from "./TaskCard";
import TaskDetailSheet from "./TaskDetailSheet";

interface CalendarDayViewProps {
  tasks: AgendaTask[];
  onOpenDetail: (task: AgendaTask) => void;
  selectedTask: AgendaTask | null;
  onCloseDetail: () => void;
}

export function CalendarDayView({ tasks, onOpenDetail, selectedTask, onCloseDetail }: CalendarDayViewProps) {
  return (
    <div className="calendar-view__day-view">
      {tasks.length === 0 ? (
        <div className="calendar-view__day-view-empty">No tasks for this day.</div>
      ) : (
        <div className="calendar-view__day-view-tasks">
          {tasks.map((task) => <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} />)}
        </div>
      )}
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={onCloseDetail} />}
    </div>
  );
}
