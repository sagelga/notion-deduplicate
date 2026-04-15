// CellValue.tsx
//
// Renders a single Notion property value inside a table cell with appropriate
// formatting and null/empty-state styling.
//
// The value comes in as a plain string (pre-stringified by the API layer) or null.
// Three cases are distinguished:
//   - null/undefined  → grey "(null)" badge  (API returned no value for this property)
//   - "" / "(empty)"  → grey "(empty)" badge  (property exists but has no content)
//   - any other       → formatted string, with ISO date strings humanised to locale format
//
// Dates are detected by a leading YYYY-MM-DD pattern. Time is appended only when
// the original value contains a "T" (ISO datetime), so date-only values stay clean.

"use client";

import "./CellValue.css";

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const hasTime = value.includes("T");

    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (!hasTime) return dateStr;

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return value;
  }
}

interface CellValueProps {
  value: string | null | undefined;
}

export function CellValue({ value }: CellValueProps) {
  if (value === null || value === undefined) {
    return <span className="cell-null">(null)</span>;
  }
  if (value === "" || value === "(empty)") {
    return <span className="cell-empty">(empty)</span>;
  }
  return <>{formatDate(value)}</>;
}
