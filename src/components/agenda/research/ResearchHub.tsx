import { useState, useCallback } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { X, Sparkles, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useResearchAgents } from "./useResearchAgents";
import { AGENT_PERSONALITIES, type AgentConfig, type ResearchResult } from "./personality-types";
import { useNotionToken } from "@/hooks/useNotionToken";
import { useAgenda } from "@/hooks/AgendaContext";
import "./ResearchHub.css";

interface ResearchHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResearchHub({ isOpen, onClose }: ResearchHubProps) {
  const { token } = useNotionToken();
  const { selectedDatabaseId, addNotification } = useAgenda();
  const [query, setQuery] = useState("");
  const [savedResultsPageId, setSavedResultsPageId] = useState<string | null>(null);

  const handleResult = useCallback(
    (_result: ResearchResult) => {
      // Real-time streaming feedback - future hook for live updates
    },
    []
  );

  const handleComplete = useCallback(
    async (allResults: ResearchResult[]) => {
      if (!token || allResults.length === 0) return;

      try {
        const properties: Record<string, unknown> = {};
        properties["Name"] = { title: [{ text: { content: `Research: ${query}` } }] };

        const content = buildNotionPageContent(query, allResults);

        const res = await fetch("/api/notion-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "/v1/pages",
            method: "POST",
            token,
            body: {
              parent: { database_id: selectedDatabaseId },
              properties,
              children: [
                {
                  object: "block",
                  type: "heading_2",
                  heading_2: {
                    rich_text: [{ type: "text", text: { content: "Research Agents Findings" } }],
                  },
                },
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: {
                          content: `Topic: ${query}\nDate: ${new Date().toLocaleDateString()}\nAgents consulted: ${allResults.length}`,
                        },
                      },
                    ],
                  },
                },
                ...content,
              ],
            },
          }),
        });

        if (!res.ok) throw new Error(`Failed to save: ${res.status}`);

        const data = await res.json();
        setSavedResultsPageId(data.id);
        addNotification({
          variant: "success",
          title: "Research saved to Notion",
          message: `Page created: ${query}`,
          autoDismissMs: 4000,
        });
      } catch (err) {
        addNotification({
          variant: "error",
          title: "Failed to save results",
          message: err instanceof Error ? err.message : "Unknown error",
          autoDismissMs: 5000,
        });
      }
    },
    [token, selectedDatabaseId, query, addNotification]
  );

  const { agents, isRunning, startResearch, cancelResearch, resetResearch } =
    useResearchAgents({ onResult: handleResult, onComplete: handleComplete });

  const handleStartResearch = () => {
    if (!query.trim()) return;
    const configs: AgentConfig[] = AGENT_PERSONALITIES.map((p) => ({ ...p }));
    startResearch(query, configs);
  };

  const handleClose = () => {
    if (isRunning) {
      cancelResearch();
    }
    resetResearch();
    setQuery("");
    setSavedResultsPageId(null);
    onClose();
  };

  const completedCount = agents.filter((a) => a.status === "complete").length;
  const totalCount = agents.length;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Deep Research"
      disableClose={isRunning}
    >
      <div className="research-hub">
        {!isRunning && agents.length === 0 && (
          <div className="research-hub__intro">
            <div className="research-hub__intro-icon">
              <Sparkles size={32} />
            </div>
            <h3>Research with 10 AI Agents</h3>
            <p>
              Each agent has a unique personality and perspective. They&apos;ll research your
              topic simultaneously and share findings in real-time.
            </p>
            <ul className="research-hub__personality-list">
              {AGENT_PERSONALITIES.map((p) => (
                <li key={p.id}>
                  <span className="personality-emoji">{p.emoji}</span>
                  <span className="personality-name">{p.name}</span>
                  <span className="personality-focus">{p.researchFocus}</span>
                </li>
              ))}
            </ul>
            <div className="research-hub__query-input">
              <input
                type="text"
                placeholder="What do you want to research?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartResearch()}
              />
              <button onClick={handleStartResearch} disabled={!query.trim()}>
                <Sparkles size={18} />
                Start Research
              </button>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="research-hub__progress">
            <div className="research-hub__progress-header">
              <h3>Researching: &ldquo;{query}&rdquo;</h3>
              <div className="research-hub__progress-count">
                <span>{completedCount}</span>/<span>{totalCount}</span> agents complete
              </div>
            </div>
            <div className="research-hub__agents-grid">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
            <button className="research-hub__cancel-btn" onClick={cancelResearch}>
              <X size={16} />
              Cancel Research
            </button>
          </div>
        )}

        {!isRunning && agents.length > 0 && (
          <div className="research-hub__results">
            <div className="research-hub__results-header">
              <h3>Research Complete</h3>
              <div className="research-hub__results-actions">
                {savedResultsPageId && (
                  <a
                    href={`https://notion.so/${savedResultsPageId.replace(/-/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="research-hub__saved-link"
                  >
                    <ExternalLink size={14} />
                    View in Notion
                  </a>
                )}
                <button onClick={handleClose} className="research-hub__new-search-btn">
                  <RefreshCw size={14} />
                  New Search
                </button>
              </div>
            </div>
            <div className="research-hub__agents-grid">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} expanded />
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    emoji: string;
    status: "idle" | "researching" | "complete" | "error";
    findings: string;
    sources: string[];
    confidence: "high" | "medium" | "low";
    error?: string;
  };
  expanded?: boolean;
}

function AgentCard({ agent, expanded }: AgentCardProps) {
  const config = AGENT_PERSONALITIES.find((p) => p.id === agent.id);

  return (
    <div
      className={[
        "agent-card",
        `agent-card--${agent.status}`,
        expanded ? "agent-card--expanded" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="agent-card__header">
        <div className="agent-card__identity">
          <span className="agent-card__emoji">{agent.emoji}</span>
          <span className="agent-card__name">{agent.name}</span>
        </div>
        <div className="agent-card__status">
          {agent.status === "researching" && (
            <>
              <Clock size={14} className="agent-card__spinner" />
              <span>Researching...</span>
            </>
          )}
          {agent.status === "complete" && (
            <>
              <CheckCircle2 size={14} className="agent-card__check" />
              <span>Done</span>
            </>
          )}
          {agent.status === "error" && (
            <>
              <AlertCircle size={14} className="agent-card__error" />
              <span>Error</span>
            </>
          )}
        </div>
      </div>

      {agent.status === "researching" && (
        <div className="agent-card__thinking">
          <div className="agent-card__thinking-dots">
            <span />
            <span />
            <span />
          </div>
          <p>{config?.approach || "Gathering insights..."}</p>
        </div>
      )}

      {agent.status === "complete" && expanded && (
        <>
          <div className="agent-card__confidence">
            <span className={`confidence-badge confidence--${agent.confidence}`}>
              {agent.confidence} confidence
            </span>
          </div>
          <div className="agent-card__findings">
            {agent.findings.split("\n").map((line, i) => {
              if (line.startsWith("##")) {
                return (
                  <h4 key={i} className="agent-card__findings-heading">
                    {line.replace(/^##\s*/, "")}
                  </h4>
                );
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return (
                  <li key={i} className="agent-card__findings-bullet">
                    {line.replace(/^[-*]\s*/, "")}
                  </li>
                );
              }
              if (line.trim()) {
                return (
                  <p key={i} className="agent-card__findings-paragraph">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>
          {agent.sources.length > 0 && (
            <div className="agent-card__sources">
              <h5>Sources:</h5>
              <ul>
                {agent.sources.map((source, i) => (
                  <li key={i}>
                    <a href={source} target="_blank" rel="noopener noreferrer">
                      {truncateUrl(source)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {agent.status === "complete" && !expanded && (
        <div className="agent-card__summary">
          {agent.findings.slice(0, 150)}
          {agent.findings.length > 150 ? "..." : ""}
        </div>
      )}

      {agent.status === "error" && (
        <div className="agent-card__error-msg">
          <p>Something went wrong</p>
          <small>{agent.error}</small>
        </div>
      )}
    </div>
  );
}

function buildNotionPageContent(
  topic: string,
  results: ResearchResult[]
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];

  results.forEach((result) => {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: { content: `${result.agentEmoji} ${result.agentName}'s Findings` },
          },
        ],
      },
    });

    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: result.findings },
          },
        ],
      },
    });

    if (result.sources.length > 0) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `Sources: ${result.sources.join(", ")}`,
              },
            },
          ],
        },
      });
    }

    blocks.push({
      object: "block",
      type: "divider",
      divider: {},
    });
  });

  return blocks;
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + "..." : u.pathname);
  } catch {
    return url.slice(0, 50);
  }
}