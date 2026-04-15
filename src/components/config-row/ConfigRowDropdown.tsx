// ConfigRowDropdown.tsx
//
// Accessible custom dropdown replacing native <select> elements throughout the
// config row. It supports an optional per-option description line, disabled
// options, and an "inline" layout variant (used inside the sentence-style
// ConfigRow where the trigger sits flush within a text sentence).
//
// Click-outside detection is set up only when the menu is open (avoids attaching
// a document listener permanently) and is cleaned up in the useEffect return.
// The disabled prop on individual options prevents selection but still renders
// the option visibly in the menu so users can see all choices.

"use client";

import { useRef, useState, useEffect } from "react";
import "./ConfigRowDropdown.css";

export interface ConfigRowDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ConfigRowDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: ConfigRowDropdownOption[];
  disabled?: boolean;
  inline?: boolean;
}

export function ConfigRowDropdown({
  value,
  onChange,
  options,
  disabled = false,
  inline = false,
}: ConfigRowDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find((opt) => opt.value === value);
  const displayLabel = currentOption?.label || "Select...";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`config-row-dropdown ${inline ? "config-row-dropdown--inline" : ""}`}
    >
      <button
        className="config-row-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        <span className="config-row-dropdown-label">{displayLabel}</span>
      </button>

      {isOpen && !disabled && (
        <div className="config-row-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`config-row-dropdown-option${opt.disabled ? " config-row-dropdown-option--disabled" : ""}${opt.value === value ? " config-row-dropdown-option--active" : ""}`}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setIsOpen(false);
                }
              }}
              disabled={opt.disabled}
              type="button"
            >
              <span className="config-row-dropdown-option-label">{opt.label}</span>
              {opt.description && (
                <span className="config-row-dropdown-option-desc">{opt.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
