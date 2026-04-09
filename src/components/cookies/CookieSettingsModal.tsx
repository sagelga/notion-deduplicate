"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
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
            <div className="cookie-category-toggle disabled" aria-hidden="true">
              <div className="toggle-track toggle-on">
                <div className="toggle-thumb" />
              </div>
            </div>
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
            <button
              className="cookie-category-toggle"
              role="switch"
              aria-checked={preferences.analytics}
              aria-label="Toggle analytics cookies"
              onClick={() => handleToggle("analytics")}
            >
              <div
                className={`toggle-track${preferences.analytics ? " toggle-on" : ""}`}
              >
                <div className="toggle-thumb" />
              </div>
            </button>
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
        <button onClick={handleSave} className="cookie-save-btn">
          Save preferences
        </button>
      </div>
    </BottomSheet>
  );
};

export default CookieSettingsModal;
