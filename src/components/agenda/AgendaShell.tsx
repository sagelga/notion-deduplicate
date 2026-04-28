// AgendaShell.tsx
// Layout shell with sidebar navigation

"use client";

import { useCallback, useState } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import { useAgendaSync } from "@/hooks/useAgendaSync";
import type { AgendaView } from "@/components/agenda/agenda-types";
import {
  Calendar,
  Inbox,
  Sun,
  Clock,
  RefreshCw,
  CheckSquare,
  Menu,
  X,
} from "lucide-react";
import "./AgendaShell.css";

interface AgendaShellProps {
  children: React.ReactNode;
}

const VIEWS: { id: AgendaView; label: string; icon: React.ReactNode }[] = [
  { id: "today", label: "Today", icon: <Sun size={18} /> },
  { id: "inbox", label: "Inbox", icon: <Inbox size={18} /> },
  { id: "upcoming", label: "Upcoming", icon: <Clock size={18} /> },
  { id: "calendar", label: "Calendar", icon: <Calendar size={18} /> },
];

export default function AgendaShell({ children }: AgendaShellProps) {
  const {
    currentView,
    setCurrentView,
    showDone,
    setShowDone,
    isLoading,
    selectedDatabaseName,
    lastSyncedAt,
  } = useAgenda();

  const { sync } = useAgendaSync();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSync = useCallback(() => sync(), [sync]);

  const handleViewChange = useCallback(
    (view: AgendaView) => {
      setCurrentView(view);
      setSidebarOpen(false);
    },
    [setCurrentView]
  );

  const lastSyncLabel = lastSyncedAt
    ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not synced yet";

  return (
    <div className="agenda-shell">
      <button
        className="agenda-shell__mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`agenda-shell__sidebar ${sidebarOpen ? "agenda-shell__sidebar--open" : ""}`}>
        <div className="agenda-shell__sidebar-header">
          <CheckSquare size={20} />
          <span className="agenda-shell__sidebar-title">Agenda</span>
        </div>

        {selectedDatabaseName && (
          <div className="agenda-shell__db-name">{selectedDatabaseName}</div>
        )}

        <nav className="agenda-shell__nav">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              className={`agenda-shell__nav-item ${currentView === view.id ? "agenda-shell__nav-item--active" : ""}`}
              onClick={() => handleViewChange(view.id)}
            >
              {view.icon}
              <span>{view.label}</span>
            </button>
          ))}
        </nav>

        <div className="agenda-shell__sidebar-footer">
          <label className="agenda-shell__toggle-row">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            <span>Show done</span>
          </label>

          <button className="agenda-shell__sync-btn" onClick={handleSync} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? "agenda-shell__sync-btn--spinning" : ""} />
            <span>{isLoading ? "Syncing..." : "Sync"}</span>
          </button>

          <div className="agenda-shell__sync-status">{lastSyncLabel}</div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="agenda-shell__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="agenda-shell__content">{children}</main>
    </div>
  );
}
