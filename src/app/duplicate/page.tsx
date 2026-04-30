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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotionToken } from "@/hooks/useNotionToken";
import { listDatabases, type NotionDatabase } from "@/lib/notion";
import DatabaseSelector from "@/components/dedup/DatabaseSelector";
import NotConfiguredView from "@/components/dedup/NotConfiguredView";
import "./page.css";

export default function DuplicatePage() {
  const { token, clearToken } = useNotionToken();
  const router = useRouter();
  // null = fetch in flight or not started; array = results (possibly empty)
  const [databases, setDatabases] = useState<NotionDatabase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load databases when token is available.
  // Only calls setState inside async callbacks — avoids cascading renders.
  useEffect(() => {
    if (!token) return;
    listDatabases(token)
      .then(setDatabases)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, [token]);

  // Derive loading: token present, fetch not yet resolved, no error
  const loading = !!token && databases === null && loadError === null;

  // SSR/hydration guard — token is null before localStorage hydrates
  if (token === null) {
    return <div className="dashboard-wrapper" />;
  }

  // Show "not configured" card if no token is present
  if (!token) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Duplicate</h1>
            <p className="dashboard-subtitle">Connect your Notion integration to get started</p>
          </div>
        </div>
        <div className="dashboard-setup-container">
          <NotConfiguredView />
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <p style={{ padding: "2rem" }}>Loading databases…</p>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-error-card">
          <h2 className="dashboard-error-title">Error</h2>
          <p className="dashboard-error-desc">{loadError}</p>
          <button
            onClick={() => {
              clearToken();
              router.push("/");
            }}
            className="dashboard-logout-btn"
          >
            Logout &amp; try a different token
          </button>
        </div>
      </div>
    );
  }

  // Show database selector
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Duplicate</h1>
          <p className="dashboard-subtitle">Select a database and a field to find and remove duplicates</p>
        </div>
        <button
          onClick={() => {
            clearToken();
            router.push("/");
          }}
          className="dashboard-logout-btn"
        >
          Logout
        </button>
      </div>
      <DatabaseSelector databases={databases ?? []} token={token} />
    </div>
  );
}
