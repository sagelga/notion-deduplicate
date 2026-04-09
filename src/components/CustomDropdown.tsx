"use client";

import { useRef, useState, useEffect } from "react";
import "./CustomDropdown.css";

export interface CustomDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomDropdownOption[];
  disabled?: boolean;
  inline?: boolean;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  disabled = false,
  inline = false,
}: CustomDropdownProps) {
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
      className={`custom-dropdown ${inline ? "custom-dropdown--inline" : ""}`}
    >
      <button
        className="custom-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        type="button"
      >
        <span className="custom-dropdown-label">{displayLabel}</span>
        <span className="custom-dropdown-arrow">{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && !disabled && (
        <div className="custom-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`custom-dropdown-option${opt.disabled ? " custom-dropdown-option--disabled" : ""}${opt.value === value ? " custom-dropdown-option--active" : ""}`}
              onClick={() => {
                if (!opt.disabled) {
                  onChange(opt.value);
                  setIsOpen(false);
                }
              }}
              disabled={opt.disabled}
              type="button"
            >
              <span className="custom-dropdown-option-label">{opt.label}</span>
              {opt.description && (
                <span className="custom-dropdown-option-desc">{opt.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
