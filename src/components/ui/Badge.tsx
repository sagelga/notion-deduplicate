// Badge.tsx
//
// Atomic badge component for status indicators and labels.
//
// Variants:
//   default   — neutral chip style
//   orange    — accent tinted
//   gray      — subtle neutral
//   green     — ok/success tinted
//   kept      — blue tint (dedup keep)
//   deleted   — red tint (dedup delete)
//   archived  — gray neutral
//   skipped   — gray neutral
//   error     — danger tinted
//   pending   — gray (dry-run would-be-actioned)
//   retry     — gray (retry queue)
//
// Usage:
//   <Badge variant="kept">Kept</Badge>
//   <Badge variant="deleted">Deleted</Badge>

"use client";

import styles from "./Badge.module.css";

export type BadgeVariant =
  | "default"
  | "orange"
  | "gray"
  | "green"
  | "kept"
  | "deleted"
  | "archived"
  | "skipped"
  | "error"
  | "pending"
  | "retry";

export interface BadgeProps {
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Badge label text */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  const classes = [styles.badge, styles[`badge--${variant}`], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
