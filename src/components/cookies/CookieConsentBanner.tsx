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
