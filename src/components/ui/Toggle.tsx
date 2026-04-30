// Toggle.tsx
//
// Atomic toggle switch component.
//
// Uses a hidden native checkbox for accessibility with visual
// styling applied to the label.
//
// States: off | on | disabled
//
// Usage:
//   <Toggle
//     checked={enabled}
//     onChange={(checked) => setEnabled(checked)}
//     label="Enable notifications"
//   />

"use client";

import styles from "./Toggle.module.css";

export interface ToggleProps {
  /** Whether the toggle is on */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Label text shown next to toggle */
  label?: string;
  /** Disable the toggle */
  disabled?: boolean;
  /** Additional CSS class for wrapper */
  className?: string;
  /** Aria-label for accessibility */
  "aria-label"?: string;
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: ToggleProps) {
  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const wrapperClasses = [
    styles["toggle-wrapper"],
    disabled ? styles["toggle-wrapper--disabled"] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const trackClasses = [
    styles["toggle-track"],
    checked ? styles["toggle-track--on"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      className={wrapperClasses}
      onClick={handleChange}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleChange();
        }
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <span className={trackClasses}>
        <span className={styles["toggle-thumb"]} />
      </span>
      {label && <span className={styles["toggle-label"]}>{label}</span>}
    </label>
  );
}
