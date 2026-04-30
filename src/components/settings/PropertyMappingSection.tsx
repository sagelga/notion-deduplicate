// PropertyMappingSection.tsx
// Property mapping UI for Agenda settings

"use client";

import React from "react";
import type { NotionProperty } from "@/lib/notion";
import type { PropertyMapping } from "@/hooks/useAgendaSync";

interface PropertyMappingSectionProps {
  savedMapping: {
    title: string;
    done: string | null;
    dueDate: string | null;
    priority: string | null;
    labels: string | null;
    recurring: string | null;
  };
  detectedMapping: {
    title: string;
    done: string | null;
    dueDate: string | null;
    priority: string | null;
    labels: string | null;
    recurring: string | null;
  };
  schema: NotionProperty[];
  onChange: (key: keyof PropertyMapping, value: string) => void;
}

interface AgendaFieldConfig {
  key: keyof PropertyMapping;
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

function sortProperties(
  props: NotionProperty[],
  fieldKey: keyof PropertyMapping,
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

export default function PropertyMappingSection({
  savedMapping,
  detectedMapping,
  schema,
  onChange,
}: PropertyMappingSectionProps) {
  return (
    <>
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
                onChange={(e) => onChange(cfg.key, e.target.value)}
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
    </>
  );
}