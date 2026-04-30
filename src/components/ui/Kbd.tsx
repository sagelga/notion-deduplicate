// Kbd.tsx
//
// Atomic keyboard hint badge component.
//
// Displays keyboard shortcuts in a monospace chip style.
// Used for keyboard navigation hints in UI.
//
// Usage:
//   <Kbd>⌘K</Kbd>
//   <Kbd>Esc</Kbd>

"use client";

import styles from "./Kbd.module.css";

export interface KbdProps {
  /** Keyboard shortcut text */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export default function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd className={[styles.kbd, className].filter(Boolean).join(" ")}>
      {children}
    </kbd>
  );
}
