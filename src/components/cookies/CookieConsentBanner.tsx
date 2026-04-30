// CookieConsentBanner.tsx
//
// GDPR-compliant cookie consent banner. Shows on first visit and requires an
// explicit action — users cannot dismiss it by clicking outside or pressing
// Escape (disableClose). Cookie categories are shown inline so users understand
// what they're consenting to before acting.
//
// Behaviour:
// - Reads persisted preferences on mount; skips display if consentGiven is true.
// - 400ms delay prevents a flash during initial hydration.
// - Analytics toggle defaults to off (opt-in, as required by GDPR).
// - "Accept all" enables all categories. "Save preferences" saves current toggles.
// - The `mounted` guard prevents SSR/hydration mismatches from localStorage reads.

"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { getCookiePreferences, setCookiePreferences } from "@/utils/cookies";
import "./CookieConsentBanner.css";

const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefs = getCookiePreferences();
    if (!prefs.consentGiven) {
      setAnalyticsEnabled(prefs.analytics);
      const timer = setTimeout(() => setIsVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const save = (analytics: boolean) => {
    setCookiePreferences({
      functional: true,
      analytics,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    setIsVisible(false);
  };

  if (!mounted) return null;

  return (
    <BottomSheet
      isOpen={isVisible}
      onClose={() => {}}
      title="Cookie Preferences"
      disableClose
    >
      <div className="cookie-banner-body">
        <p className="cookie-banner-description">
          We use cookies to keep the site working and, with your permission, to
          understand how you use it. You can choose which non-essential cookies
          to allow below. Your choice is saved in your browser and you can
          change it at any time from the site footer.
        </p>

        {/* Cookie categories */}
        <div className="cookie-categories">
          {/* Necessary — always on */}
          <div className="cookie-category">
            <div className="cookie-category-header">
              <div className="cookie-category-info">
                <span className="cookie-category-name">Necessary</span>
                <span className="cookie-category-badge">Always active</span>
              </div>
              <div className="cookie-toggle cookie-toggle--on cookie-toggle--disabled" aria-hidden="true">
                <div className="cookie-toggle-thumb" />
              </div>
            </div>
            <p className="cookie-category-desc">
              Required for the site to function. Includes your cookie consent
              choice, theme preference, and session state. Cannot be disabled.
            </p>
          </div>

          {/* Analytics — opt-in */}
          <div className="cookie-category">
            <div className="cookie-category-header">
              <div className="cookie-category-info">
                <span className="cookie-category-name">Analytics</span>
              </div>
              <button
                className={`cookie-toggle${analyticsEnabled ? " cookie-toggle--on" : ""}`}
                role="switch"
                aria-checked={analyticsEnabled}
                aria-label="Toggle analytics cookies"
                onClick={() => setAnalyticsEnabled((v) => !v)}
              >
                <div className="cookie-toggle-thumb" />
              </button>
            </div>
            <p className="cookie-category-desc">
              Helps us understand which pages are visited and how users navigate
              the site, so we can improve it. Data is aggregated and anonymous —
              no personal information is collected or shared with third parties.
            </p>
          </div>
        </div>

        {/* Policy links */}
        <div className="cookie-policy-links">
          <a
            href="https://sagelga.com/privacy-policy"
            className="cookie-policy-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          <span className="cookie-policy-sep">·</span>
          <a
            href="https://sagelga.com/cookie-policy"
            className="cookie-policy-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cookie Policy
          </a>
        </div>

        {/* Actions */}
        <div className="cookie-actions">
          <button
            className="cookie-btn cookie-btn-secondary"
            onClick={() => save(analyticsEnabled)}
          >
            Save preferences
          </button>
          <button
            className="cookie-btn cookie-btn-primary"
            onClick={() => save(true)}
          >
            Accept all
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default CookieConsentBanner;
