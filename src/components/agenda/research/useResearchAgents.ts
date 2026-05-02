import { useCallback, useRef, useState } from "react";
import type { AgentConfig, ResearchResult } from "./personality-types";

interface AgentState {
  id: string;
  name: string;
  emoji: string;
  status: "idle" | "researching" | "complete" | "error";
  findings: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  error?: string;
}

interface UseResearchAgentsOptions {
  onResult?: (result: ResearchResult) => void;
  onComplete?: (allResults: ResearchResult[]) => void;
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";

export function useResearchAgents(options: UseResearchAgentsOptions = {}) {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [topic, setTopic] = useState("");
  const resultsRef = useRef<ResearchResult[]>([]);
  const abortRef = useRef(false);

  const startResearch = useCallback(
    async (queryTopic: string, agentConfigs: AgentConfig[]) => {
      abortRef.current = false;
      resultsRef.current = [];
      setTopic(queryTopic);
      setIsRunning(true);

      const initialStates: AgentState[] = agentConfigs.map((config) => ({
        id: config.id,
        name: config.name,
        emoji: config.emoji,
        status: "idle",
        findings: "",
        sources: [],
        confidence: "medium",
      }));
      setAgents(initialStates);

      const updateAgent = (id: string, updates: Partial<AgentState>) => {
        setAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
        );
      };

      const spawnAgent = async (config: AgentConfig) => {
        if (abortRef.current) return;

        updateAgent(config.id, { status: "researching", findings: "" });

        try {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            throw new Error("ANTHROPIC_API_KEY environment variable not set");
          }

          const personalityPrompt = buildPersonalityPrompt(config, queryTopic);

          const response = await fetch(ANTHROPIC_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": ANTHROPIC_API_VERSION,
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              messages: [
                {
                  role: "user",
                  content: personalityPrompt,
                },
              ],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
          }

          if (abortRef.current) return;

          const data = await response.json();
          const content = data.content?.[0]?.text || "";

          const sources = extractSources(content);
          const confidence = assessConfidence(content);
          const findings = cleanFindings(content);

          updateAgent(config.id, {
            status: "complete",
            findings,
            sources,
            confidence,
          });

          const result: ResearchResult = {
            agentId: config.id,
            agentName: config.name,
            agentEmoji: config.emoji,
            topic: queryTopic,
            findings,
            sources,
            timestamp: new Date().toISOString(),
            confidence,
          };

          resultsRef.current.push(result);
          options.onResult?.(result);
        } catch (err) {
          if (abortRef.current) return;

          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          updateAgent(config.id, {
            status: "error",
            error: errorMsg,
            confidence: "low",
          });
        }
      };

      await Promise.all(agentConfigs.map((config) => spawnAgent(config)));

      setIsRunning(false);
      options.onComplete?.(resultsRef.current);
    },
    [options]
  );

  const cancelResearch = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
  }, []);

  const resetResearch = useCallback(() => {
    abortRef.current = true;
    resultsRef.current = [];
    setAgents([]);
    setTopic("");
    setIsRunning(false);
  }, []);

  return {
    agents,
    isRunning,
    topic,
    startResearch,
    cancelResearch,
    resetResearch,
  };
}

function buildPersonalityPrompt(config: AgentConfig, topic: string): string {
  const styleGuidance = getStyleGuidance(config.communicationStyle);

  return `You are ${config.name} (${config.emoji}) — ${config.tagline}

Your expertise: ${config.expertise.join(", ")}
Your research focus: ${config.researchFocus}
Your approach: ${config.approach}

${styleGuidance}

---

RESEARCH TOPIC: "${topic}"

Your task:
1. Research this topic thoroughly from YOUR unique perspective (${config.researchFocus})
2. Find the most relevant, up-to-date information from the internet
3. Synthesize your findings into a coherent response
4. Cite real sources (include URLs when possible)

Format your response as:
**Your Perspective** (2-3 sentences on how you approach this topic)

**Key Findings** (Your main research findings, structured as bullet points or short paragraphs)

**Evidence & Sources** (List of sources with URLs)

**Confidence Level** (high/medium/low based on how well-researched your findings are)

Be authentic to your personality. If you're skeptical, question things. If you're enthusiastic, show passion. If you're analytical, dive deep into data.`;
}

function getStyleGuidance(
  style: "formal" | "casual" | "enthusiastic" | "skeptical" | "analytical"
): string {
  switch (style) {
    case "formal":
      return `Communication style: FORMAL
- Use professional language
- Structure arguments clearly
- Back up claims with evidence
- Be precise and measured`;
    case "casual":
      return `Communication style: CASUAL
- Conversational tone
- Feel free to use analogies
- Keep it accessible and relatable
- Show personality`;
    case "enthusiastic":
      return `Communication style: ENTHUSIASTIC
- Show excitement about discoveries
- Use exclamations sparingly
- Highlight the most interesting aspects
- Keep energy high`;
    case "skeptical":
      return `Communication style: SKEPTICAL
- Question assumptions
- Look for weaknesses in common claims
- Demand evidence
- Consider alternative explanations`;
    case "analytical":
      return `Communication style: ANALYTICAL
- Break down complex topics
- Use data and evidence
- Consider multiple angles
- Be thorough and systematic`;
    default:
      return "";
  }
}

function extractSources(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = content.match(urlRegex) || [];
  const unique = [...new Set(matches)];
  return unique.slice(0, 5);
}

function assessConfidence(content: string): "high" | "medium" | "low" {
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  const wordCount = content.split(/\s+/).length;
  const hasDataPoints = /\d+/.test(content);

  if (urlCount >= 3 && wordCount > 200 && hasDataPoints) return "high";
  if (urlCount >= 1 && wordCount > 100) return "medium";
  return "low";
}

function cleanFindings(content: string): string {
  return content
    .replace(/\[.*?\]/g, "")
    .replace(/\*\*Your Perspective\*\*/gi, "## My Perspective")
    .replace(/\*\*Key Findings\*\*/gi, "## Key Findings")
    .replace(/\*\*Evidence & Sources\*\*/gi, "## Sources")
    .replace(/\*\*Confidence Level\*\*/gi, "## Confidence")
    .trim();
}