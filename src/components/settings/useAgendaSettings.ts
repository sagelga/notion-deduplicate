import { useCallback, useEffect, useMemo, useState } from "react";
import { getDatabaseSchema, listDatabases } from "@/lib/notion";
import { useAgenda } from "@/hooks/AgendaContext";
import { useNotionToken } from "@/hooks/useNotionToken";
import type { NotionProperty, NotionDatabase } from "@/lib/notion";
import type { AgendaView } from "@/components/agenda/agenda-types";

const LS_PROP_MAP = "agenda:propertyMapping";
const LS_DEFAULT_VIEW = "agenda:defaultView";
const LS_CAL_START_DAY = "agenda:calendarStartDay";
const LS_CAL_DEFAULT_MODE = "agenda:calendarDefaultMode";
const LS_DATE_FORMAT = "agenda:dateFormat";
const LS_QADD_PRIORITY = "agenda:quickAddDefaultPriority";
const LS_QADD_LABELS = "agenda:quickAddDefaultLabels";

export interface SavedPropertyMapping {
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

export function useAgendaSettings() {
  const { token } = useNotionToken();
  const agenda = useAgenda();

  const selectedDatabaseId = agenda?.selectedDatabaseId ?? null;
  const setSelectedDatabaseRef = agenda?.setSelectedDatabase;

  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [schema, setSchema] = useState<NotionProperty[]>([]);
  const [isLoadingDbs, setIsLoadingDbs] = useState(false);

  const [savedMapping, setSavedMapping] = useState<SavedPropertyMapping>(() => {
    try {
      const raw = localStorage.getItem(LS_PROP_MAP);
      if (raw) return JSON.parse(raw) as SavedPropertyMapping;
    } catch { /* ignore */ }
    return { title: "", done: null, dueDate: null, priority: null, labels: null, recurring: null };
  });

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

  const detectedMapping = useMemo(() => detectDefaultMapping(schema), [schema]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      setIsLoadingDbs(true);
      try {
        const dbs = await listDatabases(token);
        if (!cancelled) { setDatabases(dbs); setIsLoadingDbs(false); }
      } catch {
        if (!cancelled) setIsLoadingDbs(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDatabaseId) return;
    getDatabaseSchema(selectedDatabaseId, token)
      .then((s) => setSchema(s))
      .catch(() => setSchema([]));
  }, [token, selectedDatabaseId]);

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

  const handleDatabaseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      const setSelectedDatabase = setSelectedDatabaseRef ?? (() => {});
      if (!id) { setSelectedDatabase("", ""); return; }
      const db = databases.find((d) => d.id === id);
      setSelectedDatabase(id, db?.title?.[0]?.plain_text ?? id);
      persistMapping({ title: "", done: null, dueDate: null, priority: null, labels: null, recurring: null });
    },
    [databases, setSelectedDatabaseRef, persistMapping]
  );

  const handleMappingChange = useCallback(
    (key: keyof SavedPropertyMapping, value: string) => {
      const next = { ...savedMapping, [key]: value || null };
      persistMapping(next as SavedPropertyMapping);
    },
    [savedMapping, persistMapping]
  );

  return {
    selectedDatabaseId,
    databases,
    schema,
    isLoadingDbs,
    savedMapping,
    detectedMapping,
    defaultView,
    calendarStartDay,
    calendarDefaultMode,
    dateFormat,
    quickAddPriority,
    quickAddLabels,
    setDefaultView,
    setCalendarStartDay,
    setCalendarDefaultMode,
    setDateFormat,
    setQuickAddPriority,
    setQuickAddLabels,
    handleDatabaseChange,
    handleMappingChange,
  };
}