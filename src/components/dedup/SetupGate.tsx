// SetupGate.tsx
// Gate: checks auth + DB selection before showing children.
// Used by both /duplicate and /agenda.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotionToken } from "@/hooks/useNotionToken";
import { useAgenda } from "@/hooks/AgendaContext";
import { listDatabases } from "@/lib/notion";
import type { NotionDatabase } from "@/lib/notion";
import { CheckSquare, Loader2 } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import MissingNotionToken from "@/components/settings/MissingNotionToken";
import "./SetupGate.css";

interface SetupGateProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

export default function SetupGate({ children, title, description }: SetupGateProps) {
  const { token } = useNotionToken();
  const { selectedDatabaseId, setSelectedDatabase } = useAgenda();
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(!!(token && selectedDatabaseId));
  }, [token, selectedDatabaseId]);

  const fetchDatabases = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await listDatabases(token);
      setDatabases(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load databases");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && !selectedDatabaseId) {
      fetchDatabases();
    }
  }, [token, selectedDatabaseId, fetchDatabases]);

  const handleSelectDatabase = useCallback(
    (db: NotionDatabase) => {
      const name = db.title?.[0]?.plain_text ?? "Untitled Database";
      setSelectedDatabase(db.id, name);
    },
    [setSelectedDatabase]
  );

  if (isReady) {
    return <>{children}</>;
  }

  if (!token) {
    return <MissingNotionToken />;
  }

  return (
    <div className="setup-gate">
      <div className="setup-gate__card">
        <CheckSquare size={40} className="setup-gate__icon" />
        <DashboardHeader
          title={title ?? "Select a Task Database"}
          subtitle={description ?? "Choose which Notion database should be used for this feature."}
        />

        {isLoading && (
          <div className="setup-gate__loading">
            <Loader2 size={20} className="setup-gate__spinner" />
            <span>Loading databases...</span>
          </div>
        )}

        {error && <div className="setup-gate__error">{error}</div>}

        {!isLoading && databases.length === 0 && !error && (
          <div className="setup-gate__empty">
            No databases found. Make sure your integration has access to at least one database.
          </div>
        )}

        <div className="setup-gate__db-list">
          {databases.map((db) => {
            const name = db.title?.[0]?.plain_text ?? "Untitled Database";
            return (
              <button
                key={db.id}
                className="setup-gate__db-item"
                onClick={() => handleSelectDatabase(db)}
              >
                <span className="setup-gate__db-icon">📋</span>
                <span className="setup-gate__db-name">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
