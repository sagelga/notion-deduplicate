// Notification.tsx
//
// Toast-style notification component with action button support.
// Variants: info | success | warning | error
//
// Features:
//   - Optional action button with custom handler
//   - Auto-dismiss timer (cleared on hover/focus)
//   - Manual dismiss via close button
//   - Entrance/exit animations
//   - Full light/dark theme support via --nd-* tokens
//
// Usage:
//   <Notification
//     variant="success"
//     title="Changes saved"
//     message="Your preferences have been updated."
//     action={{ label: "Undo", onClick: handleUndo }}
//     onDismiss={() => setShow(false)}
//   />

"use client";

import { useEffect, useRef, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import "./Notification.css";

export type NotificationVariant = "info" | "success" | "warning" | "error";

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationProps {
  /** Visual style variant */
  variant?: NotificationVariant;
  /** Main title text */
  title: string;
  /** Optional body text below title */
  message?: string;
  /** Optional action button */
  action?: NotificationAction;
  /** Auto-dismiss after N milliseconds (default: no auto-dismiss) */
  autoDismissMs?: number;
  /** Callback when dismissed (close button or auto-dismiss) */
  onDismiss: () => void;
  /** Position on screen */
  position?: "top-right" | "bottom-right";
}

const ICONS: Record<NotificationVariant, React.ReactNode> = {
  info: <Info size={18} strokeWidth={2} />,
  success: <CheckCircle size={18} strokeWidth={2} />,
  warning: <AlertTriangle size={18} strokeWidth={2} />,
  error: <AlertCircle size={18} strokeWidth={2} />,
};

export default function Notification({
  variant = "info",
  title,
  message,
  action,
  autoDismissMs,
  onDismiss,
  position = "top-right",
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedExit = useRef(false);

  // Entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs && autoDismissMs > 0) {
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, autoDismissMs);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs]);

  const triggerDismiss = () => {
    if (hasStartedExit.current) return;
    hasStartedExit.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match CSS exit animation duration
  };

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (autoDismissMs && autoDismissMs > 0 && !hasStartedExit.current) {
      timerRef.current = setTimeout(() => {
        triggerDismiss();
      }, autoDismissMs);
    }
  };

  return (
    <div
      className={[
        "notification",
        `notification--${variant}`,
        `notification--${position}`,
        isVisible ? "notification--visible" : "",
        isExiting ? "notification--exiting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="notification__icon">{ICONS[variant]}</div>
      <div className="notification__content">
        <p className="notification__title">{title}</p>
        {message && <p className="notification__message">{message}</p>}
      </div>
      <div className="notification__actions">
        {action && (
          <button
            className="notification__action-btn"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        )}
        <button
          className="notification__close"
          onClick={(e) => {
            e.stopPropagation();
            triggerDismiss();
          }}
          aria-label="Dismiss notification"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}