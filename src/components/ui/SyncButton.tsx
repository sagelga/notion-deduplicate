// SyncButton.tsx
//
// Compound button component for sync actions with animated spinning icon.
// Wraps the base button patterns with a RefreshCw icon that animates
// when isLoading is true.
//
// The sync button is used in sidebar footers and has slightly different
// sizing than the standard button (8px 16px padding, 8px border-radius).
//
// Usage:
//   <SyncButton isLoading={isLoading} onClick={handleSync}>
//     Sync
//   </SyncButton>
//   <SyncButton isLoading={syncing} onClick={handleSync} label="Syncing..." />

"use client";

import { RefreshCw } from "lucide-react";
import styles from "./SyncButton.module.css";

export interface SyncButtonProps {
  /** Loading state — shows spinning icon and disables button */
  isLoading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Label to show (defaults to children) */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

export default function SyncButton({
  isLoading = false,
  onClick,
  label,
  disabled = false,
  className = "",
}: SyncButtonProps) {
  return (
    <button
      className={[styles["sync-btn"], isLoading ? styles["sync-btn--loading"] : "", className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={isLoading ? "Syncing" : "Sync"}
    >
      <RefreshCw
        size={16}
        className={[styles["sync-icon"], isLoading ? styles["sync-icon--spinning"] : ""].filter(Boolean).join(" ")}
      />
      <span>{isLoading && label ? label : (label ?? "Sync")}</span>
    </button>
  );
}
