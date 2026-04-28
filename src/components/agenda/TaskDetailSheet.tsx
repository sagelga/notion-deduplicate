// TaskDetailSheet.tsx
// Bottom sheet for viewing and editing task details

"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotionToken } from "@/hooks/useNotionToken";
import { useAgenda } from "@/hooks/AgendaContext";
import type { AgendaTask } from "./agenda-types";
import { X, ExternalLink, Trash2, Calendar, Clock, AlertCircle, Tag, Repeat } from "lucide-react";
import "./TaskDetailSheet.css";

interface TaskDetailSheetProps {
  task: AgendaTask;
  onClose: () => void;
}

export default function TaskDetailSheet({ task, onClose }: TaskDetailSheetProps) {
  const { token } = useNotionToken();
  const { updateTask, removeTask, addNotification } = useAgenda();

  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [dueTime, setDueTime] = useState(task.dueTime || "");
  const [priority, setPriority] = useState(task.priority || "");
  const [labelsInput, setLabelsInput] = useState(task.labels.join(", "));
  const [recurring, setRecurring] = useState(task.recurring || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const properties: Record<string, unknown> = {};
      if (title !== task.title) properties["Name"] = { title: [{ text: { content: title } }] };
      if (dueDate) {
        const dateValue: Record<string, unknown> = { start: dueDate };
        if (dueTime) dateValue.start = `${dueDate}T${dueTime}`;
        properties["Due Date"] = { date: dateValue };
      }
      if (priority) {
        properties["Priority"] = { select: { name: priority.charAt(0).toUpperCase() + priority.slice(1) } };
      } else if (task.priority) {
        properties["Priority"] = { select: null };
      }
      const newLabels = labelsInput.split(",").map((l) => l.trim()).filter(Boolean);
      if (JSON.stringify(newLabels) !== JSON.stringify(task.labels)) {
        properties["Labels"] = { multi_select: newLabels.map((l) => ({ name: l })) };
      }
      if (recurring) {
        properties["Recurring"] = { rich_text: [{ text: { content: recurring } }] };
      } else if (task.recurring) {
        properties["Recurring"] = { rich_text: [] };
      }

      if (Object.keys(properties).length > 0) {
        const res = await fetch("/api/notion-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: `/v1/pages/${task.id}`, method: "PATCH", token, body: { properties } }),
        });
        if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
      }

      updateTask(task.id, {
        title,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority: (priority as AgendaTask["priority"]) || null,
        labels: newLabels,
        recurring: recurring || null,
      });
      addNotification({ variant: "success", title: "Task updated", autoDismissMs: 2000 });
      onClose();
    } catch (err) {
      addNotification({
        variant: "error",
        title: "Failed to update task",
        message: err instanceof Error ? err.message : "Unknown error",
        autoDismissMs: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [token, task, title, dueDate, dueTime, priority, labelsInput, recurring, updateTask, addNotification, onClose]);

  const handleDelete = useCallback(async () => {
    if (!token) return;
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/notion-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `/v1/pages/${task.id}`, method: "PATCH", token, body: { archived: true } }),
      });
      if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
      removeTask(task.id);
      addNotification({ variant: "success", title: "Task deleted", autoDismissMs: 2000 });
      onClose();
    } catch (err) {
      addNotification({
        variant: "error",
        title: "Failed to delete task",
        message: err instanceof Error ? err.message : "Unknown error",
        autoDismissMs: 5000,
      });
    }
  }, [token, task.id, removeTask, addNotification, onClose]);

  const handleOpenInNotion = useCallback(() => window.open(task.url, "_blank"), [task.url]);

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail__header">
          <h3 className="task-detail__title">Task Details</h3>
          <button className="task-detail__close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="task-detail__form">
          <div className="task-detail__field">
            <label className="task-detail__label">Title</label>
            <input type="text" className="task-detail__input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="task-detail__field">
            <label className="task-detail__label"><Calendar size={14} /> Due Date</label>
            <input type="date" className="task-detail__input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="task-detail__field">
            <label className="task-detail__label"><Clock size={14} /> Time</label>
            <input type="time" className="task-detail__input" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
          <div className="task-detail__field">
            <label className="task-detail__label"><AlertCircle size={14} /> Priority</label>
            <select className="task-detail__select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">None</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="task-detail__field">
            <label className="task-detail__label"><Tag size={14} /> Labels</label>
            <input type="text" className="task-detail__input" value={labelsInput} onChange={(e) => setLabelsInput(e.target.value)} placeholder="Comma-separated" />
          </div>
          <div className="task-detail__field">
            <label className="task-detail__label"><Repeat size={14} /> Recurring</label>
            <input type="text" className="task-detail__input" value={recurring} onChange={(e) => setRecurring(e.target.value)} placeholder="e.g., every week, every Jan 26" />
          </div>
        </div>
        <div className="task-detail__actions">
          <button className="task-detail__action-btn task-detail__action-btn--notion" onClick={handleOpenInNotion}>
            <ExternalLink size={14} /> Open in Notion
          </button>
          <button className="task-detail__action-btn task-detail__action-btn--delete" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </button>
          <button className="task-detail__action-btn task-detail__action-btn--save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
