// Navbar.tsx
//
// Top navigation bar component. It is intentionally generic — it receives brand
// name, nav links, and an optional controls slot as props so it can be reused
// across different pages without hard-coding any routes or UI elements.
//
// The controls prop accepts any ReactNode, making it a flexible slot for things
// like a user avatar, search input, or theme toggle without coupling the navbar
// to any specific feature.
//
// A SettingsGear component is exported here as a convenience so callers can
// pass a gear icon link to the controls slot without importing it separately.

"use client";

import React from "react";
import Link from "next/link";
import "./Navbar.css";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
  disabled?: boolean;
}

interface NavbarProps {
  /** Brand/logo text shown in top-left */
  brandName: string;
  /** Where the brand logo links to (default: "/") */
  brandHref?: string;
  /** Navigation items */
  links?: NavItem[];
  /** Optional slot for extra controls in the top-right (e.g. search, user avatar) */
  controls?: React.ReactNode;
}

// Inline SVG gear icon for the settings link
const GearIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function SettingsGear() {
  return (
    <Link href="/settings" className="nav-settings-gear" aria-label="Settings">
      <GearIcon />
    </Link>
  );
}

export default function Navbar({
  brandName,
  brandHref = "/",
  links,
  controls,
}: NavbarProps) {

  return (
    <nav className="navbar">
      <div className="nav-top-inner">
        <Link href={brandHref} className="nav-logo-text">
          {brandName}
        </Link>
        {links && links.length > 0 && (
          <div className="nav-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {controls && <div className="nav-top-right">{controls}</div>}
      </div>
    </nav>
  );
}
