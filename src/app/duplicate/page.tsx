// page.tsx — Duplicate tool page (/duplicate)
//
// Client component. Reads the Notion token from localStorage via useNotionToken,
// fetches the list of accessible databases client-side, and passes them to
// DatabaseSelector for the user to configure and launch deduplication.
//
// If no token is present the user sees a NotConfiguredView card that links to
// the Settings page. If the Notion API call fails, an inline error card is
// shown with a logout button so the user can try a different token.

"use client";

import DashboardHeader from "@/components/DashboardHeader";
import DatabaseSelector from "@/components/dedup/DatabaseSelector";
import MissingNotionToken from "@/components/settings/MissingNotionToken";
import { useNotionToken } from "@/hooks/useNotionToken";
import { listDatabases, type NotionDatabase } from "@/lib/notion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./page.css";

export default function DuplicatePage() {
  const { token, clearToken } = useNotionToken();
  const router = useRouter();
  // null = fetch in flight or not started; array = results (possibly empty)
  const [databases, setDatabases] = useState<NotionDatabase[] | null>(null);

  // Load databases when token is available.
  // Only calls setState inside async callbacks — avoids cascading renders.
  useEffect(() => {
    if (!token) return;
    listDatabases(token)
      .then(setDatabases)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, [token]);

  // SSR/hydration guard — token is null before localStorage hydrates
  if (token === null || token === "") {
    return (
      <div className="dashboard-wrapper">
        <MissingNotionToken />
      </div>
    );
  }

  // Show database selector
  return (
    <div className="dashboard-wrapper">
      <DashboardHeader
        title="Duplicate"
        subtitle="Select a database and a field to find and remove duplicates"
      />
      <DatabaseSelector databases={databases ?? []} token={token} />
    </div>
  );
}
