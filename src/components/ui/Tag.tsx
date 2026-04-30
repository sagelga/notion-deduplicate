// Tag.tsx
//
// Atomic tag component for categories and filters.
//
// Tags are semantically for categories/filters while badges are for
// status. Visually they share the same base styles.
//
// Variants:
//   default — neutral chip style
//   orange  — accent tinted
//   gray    — subtle neutral
//   green   — ok/success tinted
//
// Usage:
//   <Tag variant="orange">Design</Tag>
//   <Tag variant="gray">Archived</Tag>

"use client";

import styles from "./Tag.module.css";

export type TagVariant = "default" | "orange" | "gray" | "green";

export interface TagProps {
  /** Visual style variant */
  variant?: TagVariant;
  /** Tag label text */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export default function Tag({
  variant = "default",
  children,
  className = "",
}: TagProps) {
  const classes = [styles.tag, styles[`tag--${variant}`], className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
