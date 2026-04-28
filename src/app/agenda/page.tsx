// Agenda page
// Main entry point for the Agenda feature

"use client";

import { AgendaProvider } from "@/hooks/AgendaContext";
import AgendaContent from "./AgendaContent";

export default function AgendaPage() {
  return (
    <AgendaProvider>
      <AgendaContent />
    </AgendaProvider>
  );
}
