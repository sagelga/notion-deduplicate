// Spinner.tsx
//
// Atomic indeterminate loading spinner component.
//
// Sizes:
//   sm — 14px, for inline use
//   md — 20px, default
//   lg — 28px, for empty states / loading screens
//
// Variants:
//   default — standard spinner
//   ring    — thinner border, used in progress islands
//
// Usage:
//   <Spinner size="sm" />
//   <Spinner size="md" variant="ring" />

"use client";

import styles from "./Spinner.module.css";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerVariant = "default" | "ring";

export interface SpinnerProps {
  /** Size variant */
  size?: SpinnerSize;
  /** Visual style variant */
  variant?: SpinnerVariant;
  /** Additional CSS class */
  className?: string;
  /** Aria-label for accessibility */
  "aria-label"?: string;
}

export default function Spinner({
  size = "md",
  variant = "default",
  className = "",
  "aria-label": ariaLabel = "Loading",
}: SpinnerProps) {
  const classes = [
    styles.spinner,
    size === "sm" || size === "lg" ? styles[`spinner--${size}`] : "",
    variant === "ring" ? styles[`spinner--${variant}`] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    />
  );
}
