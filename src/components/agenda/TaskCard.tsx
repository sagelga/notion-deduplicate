// TaskCard.tsx
// Single task card with checkbox, priority, labels, due date

"use client";

import { useCallback } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import type { AgendaTask } from "./agenda-types";
import { Repeat, Clock, AlertCircle, ChevronRight } from "lucide-react";
import "./TaskCard.css";

interface TaskCardProps {
  task: AgendaTask;
  onOpenDetail?: (task: AgendaTask) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "task-card__priority--high",
  medium: "task-card__priority--medium",
  low: "task-card__priority--low",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function TaskCard({ task, onOpenDetail }: TaskCardProps) {
  const { toggleTaskDone } = useAgenda();

  const handleToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      toggleTaskDone(task.id, e.target.checked);
    },
    [toggleTaskDone, task.id]
  );

  const handleClick = useCallback(() => {
    onOpenDetail?.(task);
  }, [onOpenDetail, task]);

  const dueLabel = formatDueLabel(task.dueDate, task.dueTime);

  return (
    <div className={`task-card ${task.done ? "task-card--done" : ""}`} onClick={handleClick}>
      <label className="task-card__checkbox" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={task.done} onChange={handleToggle} />
        <span className="task-card__checkmark" />
      </label>

      <div className="task-card__content">
        <div className="task-card__title">{task.title}</div>

        <div className="task-card__meta">
          {task.priority && (
            <span className={`task-card__priority ${PRIORITY_COLORS[task.priority]}`}>
              <AlertCircle size={12} />
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {dueLabel && (
            <span className="task-card__due">
              <Clock size={12} />
              {dueLabel}
            </span>
          )}
          {task.recurring && (
            <span className="task-card__recurring">
              <Repeat size={12} />
              {task.recurring}
            </span>
          )}
        </div>

        {task.labels.length > 0 && (
          <div className="task-card__labels">
            {task.labels.map((label) => (
              <span key={label} className="task-card__label">{label}</span>
            ))}
          </div>
        )}
      </div>

      <ChevronRight size={16} className="task-card__chevron" />
    </div>
  );
}

function formatDueLabel(date: string | null, time: string | null): string | null {
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date + "T00:00:00");
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  if (diffDays === 0) label = "Today";
  else if (diffDays === 1) label = "Tomorrow";
  else if (diffDays === -1) label = "Yesterday";
  else if (diffDays > 1 && diffDays <= 7) label = due.toLocaleDateString("en-US", { weekday: "short" });
  else label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (time) label += ` ${time}`;
  return label;
}
