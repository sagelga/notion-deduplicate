// Toggle.tsx
//
// Atomic toggle switch component.
//
// Uses a hidden native checkbox for accessibility with visual
// styling applied to the label.
//
// Sizes:
//   sm  — smaller toggle (40×22px, thumb 18px) for compact UI
//   md  — default toggle (44×24px, thumb 20px)
//   lg  — larger toggle (48×26px, thumb 22px)
//
// States: off | on | disabled
//
// Usage:
//   <Toggle
//     checked={enabled}
//     onChange={(checked) => setEnabled(checked)}
//     label="Enable notifications"
//   />
//   <Toggle
//     checked={enabled}
//     onChange={(checked) => setEnabled(checked)}
//     size="sm"
//     disabled
//   />

"use client";

import styles from "./Toggle.module.css";

export type ToggleSize = "sm" | "md" | "lg";

export interface ToggleProps {
  /** Whether the toggle is on */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Size variant */
  size?: ToggleSize;
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
  size = "md",
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
    size !== "md" ? styles[`toggle-wrapper--${size}`] : "",
    disabled ? styles["toggle-wrapper--disabled"] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const trackClasses = [
    styles["toggle-track"],
    size !== "md" ? styles[`toggle-track--${size}`] : "",
    checked ? styles["toggle-track--on"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  const thumbClasses = [
    styles["toggle-thumb"],
    size !== "md" ? styles[`toggle-thumb--${size}`] : "",
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
        <span className={thumbClasses} />
      </span>
      {label && <span className={styles["toggle-label"]}>{label}</span>}
    </label>
  );
}
