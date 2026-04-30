// settings/page.tsx
//
// Full-page Settings route with a two-column layout (sidebar + content).
// The sidebar shows section tabs; clicking one scrolls the content area to
// the corresponding section. An IntersectionObserver scrollspy highlights
// the active sidebar item as the user scrolls.

"use client";

import React, { useEffect, useRef, useState } from "react";
import ConnectionSettings from "@/components/settings/ConnectionSettings";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import "./settings.css";

const SECTIONS = [
  { id: "connection", label: "Connection" },
  { id: "appearance", label: "Appearance" },
  { id: "language", label: "Language" },
  { id: "privacy", label: "Privacy" },
] as const;

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>("connection");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        {
          rootMargin: "-20% 0px -70% 0px",
          threshold: 0,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const handleSidebarClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="settings-layout">
      {/* Page header */}
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-body">
        {/* Sidebar */}
        <nav className="settings-sidebar" aria-label="Settings sections">
          <ul className="settings-sidebar-list">
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`settings-sidebar-item${activeSection === id ? " active" : ""}`}
                  onClick={(e) => handleSidebarClick(e, id)}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="settings-content">
          <section
            id="connection"
            ref={(el) => {
              sectionRefs.current["connection"] = el;
            }}
            className="settings-section"
          >
            <div className="settings-section-header">
              <h2 className="settings-section-title">Connection</h2>
              <p className="settings-section-desc">
                Connect your Notion account using an integration token. The
                token is stored locally in your browser and is never sent to
                any server.
              </p>
            </div>
            <ConnectionSettings />
          </section>

          <section
            id="appearance"
            ref={(el) => {
              sectionRefs.current["appearance"] = el;
            }}
            className="settings-section"
          >
            <div className="settings-section-header">
              <h2 className="settings-section-title">Appearance</h2>
              <p className="settings-section-desc">
                Choose how the app looks. System will match your device
                preference automatically.
              </p>
            </div>
            <AppearanceSettings />
          </section>

          <section
            id="language"
            ref={(el) => {
              sectionRefs.current["language"] = el;
            }}
            className="settings-section"
          >
            <div className="settings-section-header">
              <h2 className="settings-section-title">Language</h2>
              <p className="settings-section-desc">
                Select your preferred display language. This setting is saved
                in your browser.
              </p>
            </div>
            <LanguageSettings />
          </section>

          <section
            id="privacy"
            ref={(el) => {
              sectionRefs.current["privacy"] = el;
            }}
            className="settings-section"
          >
            <div className="settings-section-header">
              <h2 className="settings-section-title">Privacy</h2>
              <p className="settings-section-desc">
                Manage your cookie preferences. Necessary cookies are always
                active to keep the site working.
              </p>
            </div>
            <PrivacySettings />
          </section>
        </div>
      </div>
    </div>
  );
}
