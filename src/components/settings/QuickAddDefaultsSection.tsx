// QuickAddDefaultsSection.tsx
// Quick add default settings UI for Agenda

"use client";

import React from "react";

interface QuickAddDefaultsSectionProps {
  quickAddPriority: string;
  quickAddLabels: string;
  onPriorityChange: (value: string) => void;
  onLabelsChange: (value: string) => void;
}

export default function QuickAddDefaultsSection({
  quickAddPriority,
  quickAddLabels,
  onPriorityChange,
  onLabelsChange,
}: QuickAddDefaultsSectionProps) {
  return (
    <>
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
                onClick={() => onPriorityChange(p)}
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
            onChange={(e) => onLabelsChange(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}