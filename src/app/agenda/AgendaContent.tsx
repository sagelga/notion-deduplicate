// AgendaContent.tsx
// Inner content: setup gate, shell, view routing, notifications

"use client";

import AgendaSetupGate from "@/components/agenda/AgendaSetupGate";
import AgendaShell from "@/components/agenda/AgendaShell";
import QuickAddBar from "@/components/agenda/QuickAddBar";
import TodayTaskList from "@/components/agenda/TodayTaskList";
import InboxTaskList from "@/components/agenda/InboxTaskList";
import UpcomingTaskList from "@/components/agenda/UpcomingTaskList";
import CalendarView from "@/components/agenda/CalendarView";
import Notification from "@/components/ui/Notification";
import { useAgenda } from "@/hooks/AgendaContext";
import { useAgendaSync } from "@/hooks/useAgendaSync";
import { useEffect } from "react";
import "./page.css";

export default function AgendaContent() {
  return (
    <AgendaSetupGate>
      <AgendaShellWrapper />
    </AgendaSetupGate>
  );
}

function AgendaShellWrapper() {
  const { currentView, notifications, removeNotification, isLoading, defaultView } = useAgenda();
  const { sync } = useAgendaSync();

  useEffect(() => {
    sync(defaultView);
  }, [sync, defaultView]);

  const renderView = () => {
    switch (currentView) {
      case "today": return <TodayTaskList />;
      case "inbox": return <InboxTaskList />;
      case "upcoming": return <UpcomingTaskList />;
      case "calendar": return <CalendarView />;
      default: return <TodayTaskList />;
    }
  };

  return (
    <AgendaShell>
      <div className="agenda-page">
        <QuickAddBar />
        {isLoading && (
          <div className="agenda-page__loading">
            <div className="agenda-page__loading-bar" />
          </div>
        )}
        {renderView()}
      </div>
      {notifications.map((n) => (
        <Notification key={n.id} variant={n.variant} title={n.title} message={n.message} autoDismissMs={n.autoDismissMs} onDismiss={() => removeNotification(n.id)} />
      ))}
    </AgendaShell>
  );
}
