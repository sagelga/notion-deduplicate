// InboxTaskList.tsx

"use client";

import { useMemo, useState, useCallback } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import TaskCard from "./TaskCard";
import type { AgendaTask } from "./agenda-types";
import { Inbox } from "lucide-react";
import TaskDetailSheet from "./TaskDetailSheet";
import "./InboxTaskList.css";

export default function InboxTaskList() {
  const { tasks, showDone } = useAgenda();
  const [selectedTask, setSelectedTask] = useState<AgendaTask | null>(null);

  const inboxTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.dueDate)
      .filter((t) => showDone || !t.done)
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  }, [tasks, showDone]);

  const handleOpenDetail = useCallback((task: AgendaTask) => setSelectedTask(task), []);
  const handleCloseDetail = useCallback(() => setSelectedTask(null), []);

  if (inboxTasks.length === 0) {
    return (
      <div className="inbox-list">
        <div className="inbox-list__header">
          <Inbox size={24} />
          <h2>Inbox</h2>
        </div>
        <div className="inbox-list__empty">
          <p>Your inbox is empty.</p>
          <p className="inbox-list__empty-hint">Tasks without a due date appear here.</p>
        </div>
        {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
      </div>
    );
  }

  return (
    <div className="inbox-list">
      <div className="inbox-list__header">
        <Inbox size={24} />
        <h2>Inbox</h2>
        <span className="inbox-list__count">{inboxTasks.length}</span>
      </div>
      <div className="inbox-list__tasks">
        {inboxTasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenDetail={handleOpenDetail} />
        ))}
      </div>
      {selectedTask && <TaskDetailSheet task={selectedTask} onClose={handleCloseDetail} />}
    </div>
  );
}
