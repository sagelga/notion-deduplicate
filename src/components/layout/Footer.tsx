// Footer.tsx
//
// Multi-column site footer matching sagelga.com layout:
//   - Brand column with name + tagline
//   - Link columns: Navigate, Connect
//   - Bottom bar: copyright + settings button
//   - DedupProgressBottomSheet — persistent floating dedup progress indicator
//
// DedupProgressBottomSheet is rendered here so it stays mounted across
// client-side navigations and doesn't lose state during an active run.

"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeSettingsModal from "@/components/theme/ThemeSettingsModal";
import CookieSettingsModal from "@/components/cookies/CookieSettingsModal";
import DedupProgressBottomSheet from "@/components/DedupProgressBottomSheet";
import "./Footer.css";

interface LinkItem {
  name: string;
  href: string;
  external?: boolean;
}

interface LinkColumn {
  title: string;
  links: LinkItem[];
}

const FOOTER_LINKS: LinkColumn[] = [
  {
    title: "Navigate",
    links: [
      { name: "Home", href: "/" },
      { name: "Deduplicate", href: "/duplicate" },
    ],
  },
  {
    title: "Connect",
    links: [
      { name: "GitHub", href: "https://github.com/sagelga", external: true },
      {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/kunanon/",
        external: true,
      },
    ],
  },
];

export default function Footer() {
  const [showTheme, setShowTheme] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="footer-logo-text">
              notion-tools
            </Link>
            <p className="footer-tagline">
              Deduplicate your Notion databases effortlessly.
            </p>
          </div>
          <div className="footer-columns">
            {FOOTER_LINKS.map((col) => (
              <div key={col.title} className="footer-col">
                <p className="footer-col-title">{col.title}</p>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.name}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link href={link.href}>{link.name}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom">
          <span>© 2024–{year} Kunanon Srisuntiroj</span>
          <button
            className="footer-toggle-btn"
            onClick={() => setShowTheme(true)}
            aria-label="Settings"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
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
