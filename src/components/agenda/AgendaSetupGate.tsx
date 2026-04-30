// AgendaSetupGate.tsx
// Gate: checks auth + DB selection before showing Agenda

"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotionToken } from "@/hooks/useNotionToken";
import { useAgenda } from "@/hooks/AgendaContext";
import { listDatabases } from "@/lib/notion";
import type { NotionDatabase } from "@/lib/notion";
import { CheckSquare, ExternalLink, Loader2 } from "lucide-react";
import "./AgendaSetupGate.css";

interface AgendaSetupGateProps {
  children: React.ReactNode;
}

export default function AgendaSetupGate({ children }: AgendaSetupGateProps) {
  const { token } = useNotionToken();
  const { selectedDatabaseId, setSelectedDatabase } = useAgenda();
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token && selectedDatabaseId) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
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
    return (
      <div className="agenda-setup">
        <div className="agenda-setup__card">
          <CheckSquare size={40} className="agenda-setup__icon" />
          <h2 className="agenda-setup__title">Connect Notion</h2>
          <p className="agenda-setup__desc">
            Agenda needs your Notion integration token to read and manage your tasks.
          </p>
          <a href="/settings" className="agenda-setup__cta">
            <ExternalLink size={16} />
            Go to Settings
          </a>
          <p className="agenda-setup__hint">
            Add your Notion integration token in the Connection section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="agenda-setup">
      <div className="agenda-setup__card">
        <CheckSquare size={40} className="agenda-setup__icon" />
        <h2 className="agenda-setup__title">Select a Task Database</h2>
        <p className="agenda-setup__desc">
          Choose which Notion database Agenda should use for your tasks.
        </p>

        {isLoading && (
          <div className="agenda-setup__loading">
            <Loader2 size={20} className="agenda-setup__spinner" />
            <span>Loading databases...</span>
          </div>
        )}

        {error && <div className="agenda-setup__error">{error}</div>}

        {!isLoading && databases.length === 0 && !error && (
          <div className="agenda-setup__empty">
            No databases found. Make sure your integration has access to at least one database.
          </div>
        )}

        <div className="agenda-setup__db-list">
          {databases.map((db) => {
            const name = db.title?.[0]?.plain_text ?? "Untitled Database";
            return (
              <button
                key={db.id}
                className="agenda-setup__db-item"
                onClick={() => handleSelectDatabase(db)}
              >
                <span className="agenda-setup__db-icon">📋</span>
                <span className="agenda-setup__db-name">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
