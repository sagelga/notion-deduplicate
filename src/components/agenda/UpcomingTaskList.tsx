// UpcomingTaskList.tsx

"use client";

import { useMemo, useState, useCallback } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import TaskCard from "./TaskCard";
import type { AgendaTask } from "./agenda-types";
import { Clock } from "lucide-react";
import TaskDetailSheet from "./TaskDetailSheet";
import "./UpcomingTaskList.css";

export default function UpcomingTaskList() {
  const { tasks, showDone } = useAgenda();
  const [selectedTask, setSelectedTask] = useState<AgendaTask | null>(null);

  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const groups: Map<string, AgendaTask[]> = new Map();

    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (task.dueDate <= today) continue;
      if (!showDone && task.done) continue;

      const existing = groups.get(task.dueDate) || [];
      existing.push(task);
      groups.set(task.dueDate, existing);
    }

    const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [, groupTasks] of sorted) {
      groupTasks.sort((a, b) => {
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime) return -1;
        if (b.dueTime) return 1;
        return 0;
      });
    }

    return sorted;
  }, [tasks, showDone]);

  const handleOpenDetail = useCallback((task: AgendaTask) => setSelectedTask(task), []);
  const handleCloseDetail = useCallback(() => setSelectedTask(null), []);

  const totalTasks = groupedTasks.reduce((sum, [, t]) => sum + t.length, 0);

  if (totalTasks === 0) {
    return (
      <div className="upcoming-list">
        <div className="upcoming-list__header">
          <Clock size={24} />
          <h2>Upcoming</h2>
        </div>
        <div className="upcoming-list__empty">
          <p>No upcoming tasks.</p>
          <p className="upcoming-list__empty-hint">Schedule tasks to see them here.</p>
        </div>
        {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
      </div>
    );
  }

  return (
    <div className="upcoming-list">
      <div className="upcoming-list__header">
        <Clock size={24} />
        <h2>Upcoming</h2>
        <span className="upcoming-list__count">{totalTasks} tasks</span>
      </div>
      {groupedTasks.map(([date, groupTasks]) => (
        <div key={date} className="upcoming-list__group">
          <div className="upcoming-list__group-header">{formatDateHeader(date)}</div>
          <div className="upcoming-list__group-tasks">
            {groupTasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpenDetail={handleOpenDetail} />
            ))}
          </div>
        </div>
      ))}
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + "T00:00:00");
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
}
