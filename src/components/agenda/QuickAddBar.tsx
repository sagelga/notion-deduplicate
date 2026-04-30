// QuickAddBar.tsx
// Input bar for quick task creation with natural language parsing

"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useNotionToken } from "@/hooks/useNotionToken";
import { useAgenda } from "@/hooks/AgendaContext";
import { parseQuickAdd } from "./parseQuickAdd";
import { Send, Plus, Loader2 } from "lucide-react";
import "./QuickAddBar.css";

export default function QuickAddBar() {
  const { token } = useNotionToken();
  const { selectedDatabaseId, addNotification, setTasks, quickAddDefaultPriority, quickAddDefaultLabels } = useAgenda();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof parseQuickAdd> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input.trim()) {
      setPreview(parseQuickAdd(input));
    } else {
      setPreview(null);
    }
  }, [input]);

  const handleCreate = useCallback(async () => {
    if (!input.trim() || !token || !selectedDatabaseId) return;

    const parsed = parseQuickAdd(input);
    setIsCreating(true);

    try {
      const properties: Record<string, unknown> = {};
      properties["Name"] = { title: [{ text: { content: parsed.title } }] };

      if (parsed.dueDate) {
        const dateValue: Record<string, unknown> = { start: parsed.dueDate };
        if (parsed.dueTime) dateValue.start = `${parsed.dueDate}T${parsed.dueTime}`;
        properties["Due Date"] = { date: dateValue };
      }

      if (parsed.priority) {
        properties["Priority"] = {
          select: { name: parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1) },
        };
      } else if (quickAddDefaultPriority) {
        properties["Priority"] = {
          select: { name: quickAddDefaultPriority.charAt(0).toUpperCase() + quickAddDefaultPriority.slice(1) },
        };
      }

      if (parsed.labels.length > 0) {
        properties["Labels"] = { multi_select: parsed.labels.map((l) => ({ name: l })) };
      } else if (quickAddDefaultLabels) {
        const defaultLabels = quickAddDefaultLabels.split(",").map((l) => l.trim()).filter(Boolean);
        if (defaultLabels.length > 0) {
          properties["Labels"] = { multi_select: defaultLabels.map((l) => ({ name: l })) };
        }
      }

      if (parsed.recurring) {
        properties["Recurring"] = { rich_text: [{ text: { content: parsed.recurring } }] };
      }

      const res = await fetch("/api/notion-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/v1/pages",
          method: "POST",
          token,
          body: { parent: { database_id: selectedDatabaseId }, properties },
        }),
      });

      if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);

      const data = await res.json();
      const newTask = {
        id: data.id,
        title: parsed.title,
        done: false,
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        priority: parsed.priority,
        labels: parsed.labels,
        recurring: parsed.recurring,
        createdTime: data.created_time || new Date().toISOString(),
        url: `https://notion.so/${data.id.replace(/-/g, "")}`,
        rawProperties: data.properties,
      };

      setTasks((prev) => [newTask, ...prev]);
      addNotification({ variant: "success", title: "Task created", message: parsed.title, autoDismissMs: 3000 });
      setInput("");
      setPreview(null);
    } catch (err) {
      addNotification({
        variant: "error",
        title: "Failed to create task",
        message: err instanceof Error ? err.message : "Unknown error",
        autoDismissMs: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  }, [input, token, selectedDatabaseId, addNotification, setTasks, quickAddDefaultPriority, quickAddDefaultLabels]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate]
  );

  return (
    <div className="quick-add-bar">
      <div className="quick-add-bar__input-wrap">
        <Plus size={18} className="quick-add-bar__icon" />
        <input
          ref={inputRef}
          type="text"
          className="quick-add-bar__input"
          placeholder="Add a task... (e.g., 'Meeting tomorrow at 3pm #work high')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCreating}
        />
        <button className="quick-add-bar__submit" onClick={handleCreate} disabled={!input.trim() || isCreating}>
          {isCreating ? <Loader2 size={16} className="quick-add-bar__spinner" /> : <Send size={16} />}
        </button>
      </div>
      {preview && input.trim() && (
        <div className="quick-add-bar__preview">
          {preview.dueDate && (
            <span className="quick-add-bar__preview-tag">
              📅 {formatPreviewDate(preview.dueDate)}{preview.dueTime ? ` at ${preview.dueTime}` : ""}
            </span>
          )}
          {preview.priority && (
            <span className={`quick-add-bar__preview-tag quick-add-bar__priority--${preview.priority}`}>
              {preview.priority}
            </span>
          )}
          {preview.labels.map((label) => (
            <span key={label} className="quick-add-bar__preview-tag quick-add-bar__label">#{label}</span>
          ))}
          {preview.recurring && (
            <span className="quick-add-bar__preview-tag quick-add-bar__recurring">🔁 {preview.recurring}</span>
          )}
        </div>
      )}
    </div>
  );
}

function formatPreviewDate(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
