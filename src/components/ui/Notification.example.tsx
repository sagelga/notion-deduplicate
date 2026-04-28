// Notification.example.tsx
//
// Example usage demonstrating all Notification features.
// Remove this file when integrating into your app.

"use client";

import { useState } from "react";
import Notification from "./Notification";

export default function NotificationExamples() {
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      variant: "info" | "success" | "warning" | "error";
      title: string;
      message?: string;
      action?: { label: string; onClick: () => void };
      autoDismissMs?: number;
    }>
  >([]);

  const addNotification = (
    variant: "info" | "success" | "warning" | "error",
    title: string,
    message?: string,
    action?: { label: string; onClick: () => void },
    autoDismissMs?: number
  ) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((prev) => [...prev, { id, variant, title, message, action, autoDismissMs }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 style={{ margin: 0 }}>Notification Examples</h2>

      {/* Basic notifications */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          onClick={() =>
            addNotification("info", "Tip available", "Hover over any row for details.")
          }
        >
          Info
        </button>
        <button
          onClick={() =>
            addNotification(
              "success",
              "Changes saved",
              "Your database preferences have been updated.",
              { label: "Undo", onClick: () => alert("Undo clicked") }
            )
          }
        >
          Success with action
        </button>
        <button
          onClick={() =>
            addNotification(
              "warning",
              "Low storage",
              "Your Notion workspace is running low on capacity.",
              { label: "Manage", onClick: () => alert("Manage clicked") },
              5000
            )
          }
        >
          Warning (auto-dismiss 5s)
        </button>
        <button
          onClick={() =>
            addNotification(
              "error",
              "Sync failed",
              "Could not sync changes. Check your connection and try again.",
              { label: "Retry", onClick: () => alert("Retry clicked") }
            )
          }
        >
          Error with action
        </button>
        <button
          onClick={() =>
            addNotification(
              "success",
              "Page deleted",
              "The duplicate page has been removed.",
              {
                label: "Restore",
                onClick: () => alert("Restore clicked"),
              }
            )
          }
        >
          Delete + Restore action
        </button>
      </div>

      {/* Render active notifications */}
      {notifications.map((n) => (
        <Notification
          key={n.id}
          variant={n.variant}
          title={n.title}
          message={n.message}
          action={n.action}
          autoDismissMs={n.autoDismissMs}
          onDismiss={() => removeNotification(n.id)}
        />
      ))}

      <p style={{ color: "var(--nd-text-faint)", fontSize: "0.8125rem", marginTop: "1rem" }}>
        Notifications appear in the top-right corner. Hover to pause auto-dismiss timer.
      </p>
    </div>
  );
}