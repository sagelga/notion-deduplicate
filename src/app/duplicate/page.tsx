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
import { useEffect, useRef, useState } from "react";
import "./page.css";

export default function DuplicatePage() {
  const { token } = useNotionToken();
  const [databases, setDatabases] = useState<NotionDatabase[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    if (databases !== undefined) return;

    listDatabases(token)
      .then((data) => {
        if (isMountedRef.current) setDatabases(data);
      })
      .catch((err) => {
        if (isMountedRef.current) setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [token, databases]);

  if (!token) {
    return (
      <div className="dashboard-wrapper">
        <MissingNotionToken />
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <DashboardHeader
        title="Duplicate"
        subtitle="Select a database and a field to find and remove duplicates"
      />
      {loadError ? (
        <div className="dashboard-error">
          <p>Failed to load databases: {loadError}</p>
        </div>
      ) : (
        <DatabaseSelector databases={databases ?? []} token={token} />
      )}
    </div>
  );
}
