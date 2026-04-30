// agenda-types.ts
//
// Type definitions for the Agenda feature.

export interface AgendaTask {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  dueTime: string | null;
  priority: "high" | "medium" | "low" | null;
  labels: string[];
  recurring: string | null;
  createdTime: string;
  url: string;
  rawProperties: Record<string, unknown>;
}

export type AgendaView = "today" | "inbox" | "upcoming" | "calendar";

export interface AgendaState {
  selectedDatabaseId: string | null;
  selectedDatabaseName: string | null;
  tasks: AgendaTask[];
  currentView: AgendaView;
  showDone: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  calendarMode: "month" | "week" | "day";
  calendarDate: string;
}

export interface QuickAddResult {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: "high" | "medium" | "low" | null;
  labels: string[];
  recurring: string | null;
}

export interface AgendaNotification {
  id: string;
  variant: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  autoDismissMs?: number;
}
