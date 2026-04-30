// settings/page.tsx
//
// Full-page Settings route with a two-column layout (sidebar + content).
// The sidebar shows section tabs with icons; clicking one scrolls the content
// area to the corresponding section. An IntersectionObserver scrollspy
// highlights the active sidebar item as the user scrolls.
//
// NOTE: AgendaSettings is dynamically imported with ssr:false because it
// uses useAgenda() which requires the AgendaProvider context — unavailable
// during static pre-rendering.

"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useNotionToken } from "@/hooks/useNotionToken";
import ConnectionSettings from "@/components/settings/ConnectionSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import "./settings.css";

// AgendaSettings uses useAgenda() which requires AgendaProvider — load client-side only
const AgendaSettings = dynamic(
  () => import("@/components/settings/AgendaSettings"),
  { ssr: false }
);

// ── Icons ─────────────────────────────────────────────────────────────────

const LinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const PaletteIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const CalendarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const GlobeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ShieldIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ── Section definitions ────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "connection",
    label: "Connection",
    icon: LinkIcon,
    desc: "Connect your Notion account using an integration token. The token is stored locally in your browser and is never sent to any server.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: PaletteIcon,
    desc: "Choose how the app looks. System will match your device preference automatically.",
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarIcon,
    desc: "Configure which Notion properties map to each Agenda field, your default view, and quick-add preferences.",
  },
  {
    id: "language",
    label: "Language",
    icon: GlobeIcon,
    desc: "Select your preferred display language. This setting is saved in your browser.",
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: ShieldIcon,
    desc: "Manage your cookie preferences. Necessary cookies are always active to keep the site working.",
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { token, setToken } = useNotionToken();
  const [activeSection, setActiveSection] = useState<SectionId>("connection");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Pick up OAuth token from short-lived cookie (set by /api/auth/callback),
  // move it to localStorage, then expire the cookie.
  useEffect(() => {
    if (token) return;
    const cookieToken = document.cookie
      .split("; ")
      .find((r) => r.startsWith("notion_token="))
      ?.split("=")[1];
    if (cookieToken) {
      setToken(decodeURIComponent(cookieToken));
      document.cookie = "notion_token=; maxAge=0; path=/";
    }
  }, [token, setToken]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  const handleSidebarClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="settings-layout">
      {/* Page header */}
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account and preferences</p>
      </div>

      <div className="settings-body">
        {/* Sidebar */}
        <nav className="settings-sidebar" aria-label="Settings sections">
          <div className="settings-sidebar-inner">
            <ul className="settings-sidebar-list">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`settings-sidebar-item${activeSection === id ? " active" : ""}`}
                    onClick={(e) => handleSidebarClick(e, id)}
                  >
                    <span className="settings-sidebar-icon">
                      <Icon size={15} />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Content */}
        <div className="settings-content">
          {SECTIONS.map(({ id, label, icon: Icon, desc }) => {
            const content = renderSectionContent(id, token);
            return (
              <section
                key={id}
                id={id}
                ref={(el) => { sectionRefs.current[id] = el; }}
                className="settings-section"
              >
                <div className="settings-section-header">
                  <span className="settings-section-icon">
                    <Icon size={18} />
                  </span>
                  <div className="settings-section-meta">
                    <h2 className="settings-section-title">{label}</h2>
                    <p className="settings-section-desc">{desc}</p>
                  </div>
                </div>
                <div className="settings-section-body">{content}</div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderSectionContent(id: SectionId, _token: string | null) {
  switch (id) {
    case "connection":  return <ConnectionSettings />;
    case "appearance":  return <AppearanceSettings />;
    case "agenda":      return <AgendaSettings />;
    case "language":    return <LanguageSettings />;
    case "privacy":     return <PrivacySettings />;
  }
}
