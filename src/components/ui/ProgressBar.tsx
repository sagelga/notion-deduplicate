// ProgressBar.tsx
//
// Atomic progress bar component.
//
// Variants:
//   determinate  — shows exact percentage (controlled via value)
//   indeterminate — animated sweep effect (for unknown duration)
//
// Sizes:
//   thin     — 2px height, for inline use
//   standard — 3px height, default
//   thick    — 6px height, for prominent progress
//
// States:
//   default | success | error
//
// Usage:
//   <ProgressBar value={65} variant="determinate" />
//   <ProgressBar variant="indeterminate" size="thick" />
//   <ProgressBar value={100} variant="determinate" state="success" />

"use client";

import styles from "./ProgressBar.module.css";

export type ProgressVariant = "determinate" | "indeterminate";
export type ProgressSize = "thin" | "standard" | "thick";
export type ProgressState = "default" | "success" | "error";

export interface ProgressBarProps {
  /** Progress variant */
  variant?: ProgressVariant;
  /** Size variant */
  size?: ProgressSize;
  /** State variant */
  state?: ProgressState;
  /** Current value (0-100) — required for determinate */
  value?: number;
  /** Optional label shown above */
  label?: string;
  /** Additional CSS class */
  className?: string;
  /** Aria-label for accessibility */
  "aria-label"?: string;
}

export default function ProgressBar({
  variant = "determinate",
  size = "standard",
  state = "default",
  value = 0,
  label,
  className = "",
  "aria-label": ariaLabel = "Progress",
}: ProgressBarProps) {
  const wrapperClasses = [
    styles["progress-wrapper"],
    variant === "indeterminate" ? styles[`progress--${variant}`] : "",
    size === "thin" || size === "thick" ? styles[`progress--${size}`] : "",
    state === "success" || state === "error" ? styles[`progress--${state}`] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const fillStyle =
    variant === "determinate" ? { width: `${Math.min(100, Math.max(0, value))}%` } : {};

  return (
    <div className={wrapperClasses}>
      {label && <span className={styles["progress-label"]}>{label}</span>}
      <div
        className={styles["progress-track"]}
        role="progressbar"
        aria-valuenow={variant === "determinate" ? value : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        aria-live="polite"
      >
        <div className={styles["progress-fill"]} style={fillStyle} />
      </div>
    </div>
  );
}
