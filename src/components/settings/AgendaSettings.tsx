// AgendaSettings.tsx
//
// Settings section for the Agenda feature within /settings.
// Shows a database-selection prompt if none is chosen, otherwise
// renders all Agenda configuration options.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAgenda } from "@/hooks/AgendaContext";
import { useNotionToken } from "@/hooks/useNotionToken";
import { getDatabaseSchema, listDatabases } from "@/lib/notion";
import type { NotionProperty, NotionDatabase } from "@/lib/notion";
import type { AgendaView } from "@/components/agenda/agenda-types";
import "./AgendaSettings.css";

/** Fields that can be mapped to Notion properties */
interface AgendaFieldConfig {
  key: keyof import("@/hooks/useAgendaSync").PropertyMapping;
  label: string;
  required: boolean;
  expectedTypes: string[];
}

const FIELD_CONFIGS: AgendaFieldConfig[] = [
  { key: "title", label: "Task Name", required: true, expectedTypes: ["title", "rich_text"] },
  { key: "done", label: "Done", required: false, expectedTypes: ["checkbox"] },
  { key: "dueDate", label: "Due Date", required: false, expectedTypes: ["date"] },
  { key: "priority", label: "Priority", required: false, expectedTypes: ["select"] },
  { key: "labels", label: "Tags", required: false, expectedTypes: ["multi_select"] },
  { key: "recurring", label: "Recurring", required: false, expectedTypes: ["rich_text", "title"] },
];

const LS_PROP_MAP = "agenda:propertyMapping";
const LS_DEFAULT_VIEW = "agenda:defaultView";
const LS_CAL_START_DAY = "agenda:calendarStartDay";
const LS_CAL_DEFAULT_MODE = "agenda:calendarDefaultMode";
const LS_DATE_FORMAT = "agenda:dateFormat";
const LS_QADD_PRIORITY = "agenda:quickAddDefaultPriority";
const LS_QADD_LABELS = "agenda:quickAddDefaultLabels";

interface SavedPropertyMapping {
  title: string;
  done: string | null;
  dueDate: string | null;
  priority: string | null;
  labels: string | null;
  recurring: string | null;
}

function loadString(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function loadNull(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function saveString(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/** Auto-detect a sensible default mapping from a schema */
function detectDefaultMapping(schema: NotionProperty[]): SavedPropertyMapping {
  const lowerMap = new Map<string, NotionProperty>();
  for (const prop of schema) {
    lowerMap.set(prop.name.toLowerCase(), prop);
  }

  const find = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const found = lowerMap.get(c.toLowerCase());
      if (found) return found.name;
    }
    return null;
  };

  const titleProp = schema.find((p) => p.type === "title");

  return {
    title: titleProp?.name ?? "Name",
    done: find(["done", "completed", "check", "status"]),
    dueDate: find(["due date", "due", "date", "deadline"]),
    priority: find(["priority", "importance", "urgency"]),
    labels: find(["labels", "tags", "categories", "label"]),
    recurring: find(["recurring", "repeat", "recurrence", "every"]),
  };
}

/** Sort properties: matching types first, then all others alphabetically.
 *  For the `title` field, title-type is always first, rich_text second. */
function sortProperties(
  props: NotionProperty[],
  fieldKey: keyof import("@/hooks/useAgendaSync").PropertyMapping,
  current: string | null,
  detected: string | null
): NotionProperty[] {
  const cfg = FIELD_CONFIGS.find((f) => f.key === fieldKey)!;
  const expected = cfg.expectedTypes;
  const isTitleField = fieldKey === "title";

  return [...props].sort((a, b) => {
    const aMatch = expected.includes(a.type);
    const bMatch = expected.includes(b.type);

    if (isTitleField) {
      if (a.type === "title" && b.type !== "title") return -1;
      if (b.type === "title" && a.type !== "title") return 1;
      if (a.type === "rich_text" && b.type !== "rich_text") return -1;
      if (b.type === "rich_text" && a.type !== "rich_text") return 1;
    } else {
      if (aMatch && !bMatch) return -1;
      if (bMatch && !aMatch) return 1;
    }

    if (a.name === detected && b.name !== detected) return -1;
    if (b.name === detected && a.name !== detected) return 1;

    if (a.name === current && b.name !== current) return -1;
    if (b.name === current && a.name !== current) return 1;

    return a.name.localeCompare(b.name);
  });
}

/** Wraps useAgenda to return null when used outside provider (e.g., during SSG) */
function useAgendaSafe() {
  try {
    return useAgenda();
  } catch {
    return null;
  }
}

export default function AgendaSettings() {
  const { token } = useNotionToken();
  const agenda = useAgendaSafe();

  const selectedDatabaseId = agenda?.selectedDatabaseId ?? null;
  const selectedDatabaseName = agenda?.selectedDatabaseName ?? null;
  const setSelectedDatabase = agenda?.setSelectedDatabase ?? (() => {});

  // ── Database list (local state) ──
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [schema, setSchema] = useState<NotionProperty[]>([]);
  const [isLoadingDbs, setIsLoadingDbs] = useState(false);

  // ── Saved mapping ──
  const [savedMapping, setSavedMapping] = useState<SavedPropertyMapping>(() => {
    try {
      const raw = localStorage.getItem(LS_PROP_MAP);
      if (raw) return JSON.parse(raw) as SavedPropertyMapping;
    } catch { /* ignore */ }
    return { title: "", done: null, dueDate: null, priority: null, labels: null, recurring: null };
  });

  // ── UI state ──
  const [defaultView, setDefaultViewState] = useState<AgendaView>(
    () => loadString(LS_DEFAULT_VIEW, "today") as AgendaView
  );
  const [calendarStartDay, setCalendarStartDayState] = useState(
    () => loadString(LS_CAL_START_DAY, "sunday")
  );
  const [calendarDefaultMode, setCalendarDefaultModeState] = useState(
    () => loadString(LS_CAL_DEFAULT_MODE, "month")
  );
  const [dateFormat, setDateFormatState] = useState(
    () => loadString(LS_DATE_FORMAT, "system")
  );
  const [quickAddPriority, setQuickAddPriorityState] = useState(
    () => loadString(LS_QADD_PRIORITY, "medium")
  );
  const [quickAddLabels, setQuickAddLabelsState] = useState(
    () => loadNull(LS_QADD_LABELS) ?? ""
  );

  const detectedMapping = React.useMemo(
    () => detectDefaultMapping(schema),
    [schema]
  );

  // ── Load databases when token changes ──
  useEffect(() => {
    if (!token) return;
    setIsLoadingDbs(true);
    listDatabases(token)
      .then((dbs) => { setDatabases(dbs); setIsLoadingDbs(false); })
      .catch(() => { setIsLoadingDbs(false); });
  }, [token]);

  // ── Load schema when database changes ──
  useEffect(() => {
    if (!token || !selectedDatabaseId) return;
    getDatabaseSchema(selectedDatabaseId, token)
      .then((s) => setSchema(s))
      .catch(() => setSchema([]));
  }, [token, selectedDatabaseId]);

  // ── Persist helpers ──
  const persistMapping = useCallback((next: SavedPropertyMapping) => {
    setSavedMapping(next);
    try { localStorage.setItem(LS_PROP_MAP, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const setDefaultView = useCallback((v: AgendaView) => {
    setDefaultViewState(v);
    saveString(LS_DEFAULT_VIEW, v);
  }, []);

  const setCalendarStartDay = useCallback((v: string) => {
    setCalendarStartDayState(v);
    saveString(LS_CAL_START_DAY, v);
  }, []);

  const setCalendarDefaultMode = useCallback((v: string) => {
    setCalendarDefaultModeState(v);
    saveString(LS_CAL_DEFAULT_MODE, v);
  }, []);

  const setDateFormat = useCallback((v: string) => {
    setDateFormatState(v);
    saveString(LS_DATE_FORMAT, v);
  }, []);

  const setQuickAddPriority = useCallback((v: string) => {
    setQuickAddPriorityState(v);
    saveString(LS_QADD_PRIORITY, v);
  }, []);

  const setQuickAddLabels = useCallback((v: string) => {
    setQuickAddLabelsState(v);
    saveString(LS_QADD_LABELS, v || "");
  }, []);

  // ── Database selector ──
  const handleDatabaseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (!id) { setSelectedDatabase("", ""); return; }
      const db = databases.find((d) => d.id === id);
      setSelectedDatabase(id, db?.title?.[0]?.plain_text ?? id);
      // Reset mapping when database changes
      persistMapping({ title: "", done: null, dueDate: null, priority: null, labels: null, recurring: null });
    },
    [databases, setSelectedDatabase, persistMapping]
  );

  // ── Property mapping change ──
  const handleMappingChange = useCallback(
    (key: keyof SavedPropertyMapping, value: string) => {
      const next = { ...savedMapping, [key]: value || null };
      persistMapping(next as SavedPropertyMapping);
    },
    [savedMapping, persistMapping]
  );

  // ── No database selected: show prompt ──
  if (!selectedDatabaseId) {
    return (
      <div className="agenda-settings">
        <div className="agenda-db-selector">
          <label className="agenda-db-selector-label" htmlFor="agenda-db-select">
            Notion Task Database
          </label>
          <p className="agenda-db-selector-desc">
            Select the Notion database you want to use for tasks. Make sure it contains a &quot;Name&quot; property.
          </p>
          <select
            id="agenda-db-select"
            className="agenda-prop-select"
            value=""
            onChange={handleDatabaseChange}
          >
            <option value="">— Select a database —</option>
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.title?.[0]?.plain_text ?? db.id}
              </option>
            ))}
          </select>
          {isLoadingDbs && (
            <p className="agenda-db-selector-desc" style={{ marginTop: "0.5rem" }}>
              Loading databases…
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Database selected: full settings ──
  return (
    <div className="agenda-settings">
      {/* Database selector */}
      <div className="agenda-db-selector" style={{ marginBottom: "0.5rem" }}>
        <label className="agenda-db-selector-label" htmlFor="agenda-db-select">
          Notion Task Database
        </label>
        <select
          id="agenda-db-select"
          className="agenda-prop-select"
          value={selectedDatabaseId}
          onChange={handleDatabaseChange}
        >
          <option value="">— Select a database —</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.title?.[0]?.plain_text ?? db.id}
            </option>
          ))}
        </select>
      </div>

      {/* Property mapping */}
      <p className="agenda-settings-subtitle">Property Mapping</p>
      <div style={{ border: "1px solid var(--nd-divider)", borderRadius: "var(--nd-radius-md)", overflow: "hidden" }}>
        {FIELD_CONFIGS.map((cfg) => {
          const current = savedMapping[cfg.key] ?? detectedMapping[cfg.key] ?? "";
          const sorted = schema.length > 0
            ? sortProperties(schema, cfg.key, current, detectedMapping[cfg.key])
            : [];

          return (
            <div key={cfg.key} className="agenda-prop-row">
              <label className="agenda-prop-label" htmlFor={`prop-${cfg.key}`}>
                {cfg.label}
                {cfg.required && <span className="agenda-prop-required">*</span>}
              </label>
              <select
                id={`prop-${cfg.key}`}
                className="agenda-prop-select"
                value={current}
                onChange={(e) => handleMappingChange(cfg.key, e.target.value)}
              >
                <option value="">— Not mapped —</option>
                {sorted.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Default view */}
      <p className="agenda-settings-subtitle">Default View</p>
      <div className="agenda-view-options">
        {(["today", "inbox", "upcoming", "calendar"] as AgendaView[]).map((v) => (
          <button
            key={v}
            type="button"
            className={`agenda-view-btn${defaultView === v ? " active" : ""}`}
            onClick={() => setDefaultView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Calendar settings */}
      <p className="agenda-settings-subtitle">Calendar</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="agenda-prop-row" style={{ paddingBottom: "0" }}>
          <label className="agenda-prop-label" htmlFor="cal-start-day">Start week on</label>
          <select
            id="cal-start-day"
            className="agenda-prop-select"
            value={calendarStartDay}
            onChange={(e) => setCalendarStartDay(e.target.value)}
          >
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>
        <div className="agenda-prop-row" style={{ paddingTop: "0", paddingBottom: "0" }}>
          <label className="agenda-prop-label" htmlFor="cal-default-mode">Default mode</label>
          <select
            id="cal-default-mode"
            className="agenda-prop-select"
            value={calendarDefaultMode}
            onChange={(e) => setCalendarDefaultMode(e.target.value)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div className="agenda-prop-row" style={{ paddingTop: "0" }}>
          <label className="agenda-prop-label" htmlFor="date-format">Date format</label>
          <select
            id="date-format"
            className="agenda-prop-select"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option value="system">System default</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      {/* Quick-add defaults */}
      <p className="agenda-settings-subtitle">Quick Add Defaults</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label
            className="agenda-prop-label"
            style={{ display: "block", marginBottom: "0.375rem" }}
            htmlFor="qadd-priority"
          >
            Default priority
          </label>
          <div className="agenda-priority-btns">
            {["high", "medium", "low"].map((p) => (
              <button
                key={p}
                type="button"
                className={`agenda-priority-btn${quickAddPriority === p ? " active" : ""}`}
                onClick={() => setQuickAddPriority(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            className="agenda-prop-label"
            style={{ display: "block", marginBottom: "0.375rem" }}
            htmlFor="qadd-labels"
          >
            Default tags
          </label>
          <input
            id="qadd-labels"
            type="text"
            className="agenda-prop-select"
            style={{ width: "100%" }}
            placeholder="Comma-separated tags (e.g., work, personal)"
            value={quickAddLabels}
            onChange={(e) => setQuickAddLabels(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
