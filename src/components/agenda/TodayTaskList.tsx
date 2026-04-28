// TodayTaskList.tsx

"use client";

import { useMemo, useState, useCallback } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import TaskCard from "./TaskCard";
import type { AgendaTask } from "./agenda-types";
import { Sun } from "lucide-react";
import TaskDetailSheet from "./TaskDetailSheet";
import "./TodayTaskList.css";

export default function TodayTaskList() {
  const { tasks, showDone } = useAgenda();
  const [selectedTask, setSelectedTask] = useState<AgendaTask | null>(null);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks
      .filter((t) => {
        if (!t.dueDate) return false;
        if (t.dueDate === today) return true;
        if (t.dueDate < today && !t.done) return true;
        return false;
      })
      .filter((t) => showDone || !t.done)
      .sort(sortByPriorityThenTime);
  }, [tasks, showDone]);

  const handleOpenDetail = useCallback((task: AgendaTask) => setSelectedTask(task), []);
  const handleCloseDetail = useCallback(() => setSelectedTask(null), []);

  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => t.dueDate && t.dueDate < today && !t.done).length;
  }, [tasks]);

  if (todayTasks.length === 0) {
    return (
      <div className="today-list">
        <div className="today-list__header">
          <Sun size={24} />
          <h2>Today</h2>
        </div>
        <div className="today-list__empty">
          <p>No tasks for today.</p>
          <p className="today-list__empty-hint">Use the Quick Add bar to create a task.</p>
        </div>
        {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
      </div>
    );
  }

  return (
    <div className="today-list">
      <div className="today-list__header">
        <Sun size={24} />
        <h2>Today</h2>
        {overdueCount > 0 && <span className="today-list__overdue-badge">{overdueCount} overdue</span>}
      </div>
      <div className="today-list__tasks">
        {todayTasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenDetail={handleOpenDetail} />
        ))}
      </div>
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
    </div>
  );
}

function sortByPriorityThenTime(a: AgendaTask, b: AgendaTask): number {
  const priorityOrder = { high: 0, medium: 1, low: 2, null: 3 };
  const pa = a.priority ? priorityOrder[a.priority] : 3;
  const pb = b.priority ? priorityOrder[b.priority] : 3;
  if (pa !== pb) return pa - pb;
  if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
  if (a.dueTime) return -1;
  if (b.dueTime) return 1;
  return 0;
}
