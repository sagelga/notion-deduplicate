"use client";

import React, { useState } from "react";
import ThemeSettingsModal from "@/components/theme/ThemeSettingsModal";
import CookieSettingsModal from "@/components/cookies/CookieSettingsModal";
import DedupProgressBottomSheet from "@/components/DedupProgressBottomSheet";
import "./Footer.css";

interface FooterProps {
  /** Optional: Year to show in copyright (default: 2024) */
  copyrightStart?: number;
}

export default function Footer({ copyrightStart = 2024 }: FooterProps) {
  const [showTheme, setShowTheme] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">
          © {copyrightStart} notion-tools
        </span>

        <div className="footer-controls">
          <button
            className="footer-toggle-btn"
            onClick={() => setShowTheme(true)}
            aria-label="Theme settings"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Theme</span>
          </button>
          <button
            className="footer-toggle-btn"
            onClick={() => setShowCookies(true)}
            aria-label="Cookie settings"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
            </svg>
            <span>Cookies</span>
          </button>
        </div>
      </div>

      <ThemeSettingsModal
        isOpen={showTheme}
        onClose={() => setShowTheme(false)}
      />
      <CookieSettingsModal
        isOpen={showCookies}
        onClose={() => setShowCookies(false)}
        onSave={() => setShowCookies(false)}
      />
      <DedupProgressBottomSheet />
    </footer>
  );
}
