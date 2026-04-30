// CookieSettingsModal.tsx
//
// Granular cookie preference editor rendered as a BottomSheet. Shows one row per
// cookie category:
//   - Functional: always-on (toggle is rendered as disabled/decorative).
//   - Analytics: user-toggleable.
//
// Preferences are loaded from localStorage via getCookiePreferences on mount and
// only written back when the user explicitly clicks "Save preferences". Closing
// the sheet without saving discards in-flight toggle changes.
//
// The `mounted` guard (same pattern as CookieConsentBanner) prevents rendering
// during SSR to avoid hydration mismatches from localStorage access.

"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { Button, Toggle } from "@/components/ui";
import { getCookiePreferences, setCookiePreferences } from "@/utils/cookies";
import "./CookieSettingsModal.css";

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [preferences, setPreferences] = useState({
    functional: true,
    analytics: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = getCookiePreferences();
    setPreferences({
      functional: current.functional,
      analytics: current.analytics,
    });
  }, []);

  const handleToggle = (key: "analytics") => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setCookiePreferences({
      ...preferences,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    onSave();
    onClose();
  };

  if (!mounted) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Cookie Settings">
      <div className="cookie-settings-list">
        {/* Functional — always on */}
        <div className="cookie-category">
          <div className="cookie-category-header">
            <div className="cookie-category-info">
              <h3 className="cookie-category-name">Functional</h3>
              <span className="cookie-category-badge">Required</span>
            </div>
            <Toggle
              checked={true}
              onChange={() => {}}
              disabled
              aria-label="Functional cookies are always active"
            />
          </div>
          <p className="cookie-category-description">
            Essential for the website to function. These cannot be disabled.
          </p>
        </div>

        {/* Analytics — toggleable */}
        <div className="cookie-category">
          <div className="cookie-category-header">
            <div className="cookie-category-info">
              <h3 className="cookie-category-name">Analytics</h3>
            </div>
            <Toggle
              checked={preferences.analytics}
              onChange={(checked) => handleToggle("analytics")}
              aria-label="Toggle analytics cookies"
            />
          </div>
          <p className="cookie-category-description">
            Help us understand how visitors use the site so we can improve it.
            All data is anonymous.
          </p>
        </div>
      </div>

      <div className="cookie-settings-footer">
        <p className="cookie-learn-more">
          Learn more in our{" "}
          <a
            href="https://sagelga.com/privacy-policy"
            className="cookie-learn-more-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div className="cookie-settings-actions">
        <Button
          variant="primary"
          size="lg"
          block
          onClick={handleSave}
        >
          Save preferences
        </Button>
      </div>
    </BottomSheet>
  );
};

export default CookieSettingsModal;
