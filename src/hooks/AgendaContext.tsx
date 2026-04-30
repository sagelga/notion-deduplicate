// AgendaContext.tsx
//
// Global context for the Agenda feature. Manages:
//   - Selected Notion database (task database)
//   - Task list state
//   - Current view (today/inbox/upcoming/calendar)
//   - Show done toggle
//   - Calendar mode and focused date
//   - Notifications
//
// Persists selected database ID and showDone preference to localStorage.

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AgendaTask,
  AgendaView,
  AgendaNotification,
} from "@/components/agenda/agenda-types";

const LS_DB_ID = "agenda:databaseId";
const LS_DB_NAME = "agenda:databaseName";
const LS_SHOW_DONE = "agenda:showDone";

interface AgendaContextValue {
  // Database selection
  selectedDatabaseId: string | null;
  selectedDatabaseName: string | null;
  setSelectedDatabase: (id: string, name: string) => void;

  // Tasks
  tasks: AgendaTask[];
  setTasks: React.Dispatch<React.SetStateAction<AgendaTask[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  lastSyncedAt: string | null;
  setLastSyncedAt: (date: string | null) => void;

  // View
  currentView: AgendaView;
  setCurrentView: (view: AgendaView) => void;

  // Show done
  showDone: boolean;
  setShowDone: (show: boolean) => void;

  // Calendar
  calendarMode: "month" | "week" | "day";
  setCalendarMode: (mode: "month" | "week" | "day") => void;
  calendarDate: string;
  setCalendarDate: (date: string) => void;

  // Notifications
  notifications: AgendaNotification[];
  addNotification: (n: Omit<AgendaNotification, "id">) => void;
  removeNotification: (id: string) => void;

  // Task mutations
  toggleTaskDone: (taskId: string, done: boolean) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<AgendaTask>) => void;
}

const AgendaContext = createContext<AgendaContextValue | null>(null);

export function useAgenda(): AgendaContextValue {
  const ctx = useContext(AgendaContext);
  if (!ctx) {
    throw new Error("useAgenda must be used within an AgendaProvider");
  }
  return ctx;
}

interface AgendaProviderProps {
  children: React.ReactNode;
}

export function AgendaProvider({ children }: AgendaProviderProps) {
  // Database selection (persisted)
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_DB_ID); } catch { return null; }
  });
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_DB_NAME); } catch { return null; }
  });

  // Tasks
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // View
  const [currentView, setCurrentView] = useState<AgendaView>("today");

  // Show done (persisted)
  const [showDone, setShowDoneState] = useState(() => {
    try {
      const val = localStorage.getItem(LS_SHOW_DONE);
      return val === "true";
    } catch {
      return false;
    }
  });

  // Calendar
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

  // Notifications
  const [notifications, setNotifications] = useState<AgendaNotification[]>([]);
  const notificationIdRef = useRef(0);

  const setSelectedDatabase = useCallback((id: string, name: string) => {
    setSelectedDatabaseId(id);
    setSelectedDatabaseName(name);
    try {
      localStorage.setItem(LS_DB_ID, id);
      localStorage.setItem(LS_DB_NAME, name);
    } catch {
      // ignore
    }
  }, []);

  const setShowDone = useCallback((show: boolean) => {
    setShowDoneState(show);
    try {
      localStorage.setItem(LS_SHOW_DONE, String(show));
    } catch {
      // ignore
    }
  }, []);

  const addNotification = useCallback(
    (n: Omit<AgendaNotification, "id">) => {
      const id = `notif-${++notificationIdRef.current}`;
      setNotifications((prev) => [...prev, { ...n, id }]);

      if (n.autoDismissMs) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== id));
        }, n.autoDismissMs);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toggleTaskDone = useCallback((taskId: string, done: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done } : t))
    );
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const updateTask = useCallback(
    (taskId: string, updates: Partial<AgendaTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const value = useMemo<AgendaContextValue>(
    () => ({
      selectedDatabaseId,
      selectedDatabaseName,
      setSelectedDatabase,
      tasks,
      setTasks,
      isLoading,
      setIsLoading,
      error,
      setError,
      lastSyncedAt,
      setLastSyncedAt,
      currentView,
      setCurrentView,
      showDone,
      setShowDone,
      calendarMode,
      setCalendarMode,
      calendarDate,
      setCalendarDate,
      notifications,
      addNotification,
      removeNotification,
      toggleTaskDone,
      removeTask,
      updateTask,
    }),
    [
      selectedDatabaseId,
      selectedDatabaseName,
      setSelectedDatabase,
      tasks,
      isLoading,
      error,
      lastSyncedAt,
      currentView,
      showDone,
      setShowDone,
      calendarMode,
      calendarDate,
      notifications,
      addNotification,
      removeNotification,
      toggleTaskDone,
      removeTask,
      updateTask,
    ]
  );

  return (
    <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>
  );
}
