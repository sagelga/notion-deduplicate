// PrivacySettings.tsx
//
// Cookie preference settings for the Settings page. Displays cookie categories
// (Necessary and Analytics) as inline rows with a toggle switch each.
// The analytics toggle is functional; necessary is always-on and visually disabled.

"use client";

import React, { useState } from "react";
import { getCookiePreferences, setCookiePreferences } from "@/utils/cookies";
import Toggle from "@/components/ui/Toggle";
import "./PrivacySettings.css";

export default function PrivacySettings() {
  // Lazy-initialize from localStorage — getCookiePreferences returns the
  // default (analytics: false) on SSR where window is undefined, so no
  // effect is needed and there is no cascading render.
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(() =>
    getCookiePreferences().analytics
  );

  return (
    <div className="privacy-settings">
      <div className="privacy-category">
        <div className="privacy-category-header">
          <div className="privacy-category-info">
            <span className="privacy-category-name">Necessary</span>
            <span className="privacy-category-badge">Always active</span>
          </div>
          <Toggle
              checked={true}
              onChange={() => {}}
              disabled
              aria-label="Necessary cookies (always active)"
            />
        </div>
        <p className="privacy-category-desc">
          Required for the site to function. Includes your cookie consent
          choice, theme preference, and session state. Cannot be disabled.
        </p>
      </div>

      <div className="privacy-category">
        <div className="privacy-category-header">
          <div className="privacy-category-info">
            <span className="privacy-category-name">Analytics</span>
          </div>
          <Toggle
              checked={analyticsEnabled}
              onChange={(checked) => {
                setAnalyticsEnabled(checked);
                setCookiePreferences({
                  functional: true,
                  analytics: checked,
                  consentGiven: true,
                  consentTimestamp: Date.now(),
                });
              }}
              aria-label="Toggle analytics cookies"
            />
        </div>
        <p className="privacy-category-desc">
          Helps us understand which pages are visited and how users navigate
          the site, so we can improve it. Data is aggregated and anonymous —
          no personal information is collected or shared with third parties.
        </p>
      </div>

      <div className="privacy-policy-links">
        <a
          href="https://sagelga.com/privacy-policy"
          className="privacy-policy-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        <span className="privacy-policy-sep">·</span>
        <a
          href="https://sagelga.com/cookie-policy"
          className="privacy-policy-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cookie Policy
        </a>
      </div>
    </div>
  );
}
