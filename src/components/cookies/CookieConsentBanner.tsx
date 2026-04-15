// CookieConsentBanner.tsx
//
// GDPR-style cookie consent banner that appears on first visit (or whenever
// consent has not yet been recorded). It is rendered as a BottomSheet so it
// appears above other page content without causing layout shifts.
//
// Behaviour:
// - On mount it reads the persisted cookie preferences. If consent has already
//   been given, the banner is never shown.
// - A 400ms delay before showing the banner prevents it from flashing during
//   the initial page render/hydration.
// - "Accept all" enables both functional and analytics cookies.
// - "Reject all" / closing the sheet enables only functional (required) cookies.
// - "Manage preferences" opens CookieSettingsModal for granular control.
//
// The `mounted` guard prevents the component from rendering during SSR, which
// would cause a hydration mismatch because localStorage is not available server-side.

"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import CookieSettingsModal from "./CookieSettingsModal";
import { getCookiePreferences, setCookiePreferences } from "@/utils/cookies";
import "./CookieConsentBanner.css";

const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefs = getCookiePreferences();
    if (!prefs.consentGiven) {
      const timer = setTimeout(() => setIsVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    setCookiePreferences({
      functional: true,
      analytics: true,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    setCookiePreferences({
      functional: true,
      analytics: false,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    setShowSettings(false);
    setIsVisible(false);
  };

  if (!mounted) return null;

  return (
    <>
      <BottomSheet
        isOpen={isVisible}
        onClose={handleRejectAll}
        title="Cookie Preferences"
      >
        <div className="cookie-banner-body">
          <p className="cookie-banner-description">
            We use cookies to improve your experience. Functional cookies are
            always active. You can choose whether to allow analytics cookies.
          </p>
          <div className="cookie-banner-links">
            <a
              href="https://sagelga.com/privacy-policy"
              className="cookie-banner-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            <span className="cookie-banner-sep">·</span>
            <button
              className="cookie-banner-link"
              onClick={() => setShowSettings(true)}
            >
              Manage preferences
            </button>
          </div>
          <div className="cookie-banner-actions">
            <button
              className="cookie-btn cookie-btn-accept"
              onClick={handleAcceptAll}
            >
              Accept all
            </button>
            <button
              className="cookie-btn cookie-btn-reject"
              onClick={handleRejectAll}
            >
              Reject all
            </button>
          </div>
        </div>
      </BottomSheet>

      <CookieSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSavePreferences}
      />
    </>
  );
};

export default CookieConsentBanner;
