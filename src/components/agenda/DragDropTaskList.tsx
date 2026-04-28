// DragDropTaskList.tsx
// Wraps TaskCards with @hello-pangea/dnd drag-and-drop

"use client";

import { useCallback, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAgenda } from "@/hooks/AgendaContext";
import { useNotionToken } from "@/hooks/useNotionToken";
import TaskCard from "./TaskCard";
import type { AgendaTask } from "./agenda-types";
import type { DropResult } from "@hello-pangea/dnd";
import "./DragDropTaskList.css";

interface DragDropTaskListProps {
  tasks: AgendaTask[];
  droppableId: string;
  onOpenDetail: (task: AgendaTask) => void;
  targetDate?: string;
}

export default function DragDropTaskList({ tasks, droppableId, onOpenDetail, targetDate }: DragDropTaskListProps) {
  const { token } = useNotionToken();
  const { updateTask, addNotification } = useAgenda();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = useCallback((start: { draggableId: string }) => {
    setDraggingId(start.draggableId);
  }, []);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      setDraggingId(null);
      const { destination, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === result.source.droppableId && destination.index === result.source.index) return;

      const task = tasks.find((t) => t.id === draggableId);
      if (!task) return;

      if (targetDate && task.dueDate !== targetDate) {
        if (!token) {
          addNotification({ variant: "error", title: "Not connected", message: "Please connect your Notion account.", autoDismissMs: 3000 });
          return;
        }
        try {
          const res = await fetch("/api/notion-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: `/v1/pages/${task.id}`,
              method: "PATCH",
              token,
              body: { properties: { "Due Date": { date: { start: targetDate } } } },
            }),
          });
          if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
          updateTask(task.id, { dueDate: targetDate });
          addNotification({ variant: "success", title: "Task rescheduled", message: `${task.title} → ${formatDate(targetDate)}`, autoDismissMs: 2000 });
        } catch (err) {
          addNotification({ variant: "error", title: "Failed to reschedule", message: err instanceof Error ? err.message : "Unknown error", autoDismissMs: 5000 });
        }
      }
    },
    [tasks, token, targetDate, updateTask, addNotification]
  );

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`drag-drop-list ${snapshot.isDraggingOver ? "drag-drop-list--active" : ""}`}>
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={draggingId !== null && draggingId !== task.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`drag-drop-item ${snapshot.isDragging ? "drag-drop-item--dragging" : ""}`}>
                    <TaskCard task={task} onOpenDetail={onOpenDetail} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
