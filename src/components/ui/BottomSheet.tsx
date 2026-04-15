// BottomSheet.tsx
//
// Generic modal sheet that slides up from the bottom of the viewport. Used as
// the base layer for ThemeSettingsModal, CookieSettingsModal, and the cookie
// consent banner.
//
// Accessibility:
//   - role="dialog" + aria-modal="true" + aria-labelledby on the inner panel so
//     screen readers correctly announce it as a dialog.
//   - The drag handle div is purely decorative (no aria role) and does not
//     implement actual drag-to-dismiss behaviour.
//
// Overlay click-to-close: handleOverlayClick uses e.target === e.currentTarget
// to distinguish clicks directly on the backdrop from clicks that bubble up from
// the sheet content — only the former closes the sheet.
//
// Scroll lock: body overflow is set to "hidden" while open to prevent background
// content from scrolling behind the sheet.

"use client";

import React, { useEffect } from "react";
import "./BottomSheet.css";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={handleOverlayClick}>
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        <div className="bottom-sheet-drag-handle" />
        <div className="bottom-sheet-header">
          <h2 id="bottom-sheet-title">{title}</h2>
          <button
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </div>
  );
};

export default BottomSheet;
