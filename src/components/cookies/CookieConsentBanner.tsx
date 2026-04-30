// CookieConsentBanner.tsx
//
// GDPR/cookie consent banner rendered as a BottomSheet that slides up from the
// bottom of the viewport. Shown automatically when the user has not yet given
// consent (consentGiven is false). Once the user accepts or customises preferences
// the banner is dismissed and will not appear again.
//
// The `mounted` guard prevents rendering during SSR to avoid hydration mismatches
// from localStorage access.

"use client";

import React, { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui";
import {
  setCookiePreferences,
  hasConsent,
} from "@/utils/cookies";
import CookieSettingsModal from "@/components/cookies/CookieSettingsModal";
import "./CookieConsentBanner.css";

const COOKIE_BANNER_STORAGE_KEY = "cookie-banner-dismissed";

export default function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(COOKIE_BANNER_STORAGE_KEY);
    if (!dismissed && !hasConsent()) {
      setIsOpen(true);
    }
  }, []);

  const handleAcceptAll = () => {
    setCookiePreferences({
      functional: true,
      analytics: true,
      consentGiven: true,
      consentTimestamp: Date.now(),
    });
    setIsOpen(false);
    localStorage.setItem(COOKIE_BANNER_STORAGE_KEY, "true");
  };

  const handleCustomize = () => {
    setShowSettings(true);
  };

  const handleSettingsSave = () => {
    setIsOpen(false);
    localStorage.setItem(COOKIE_BANNER_STORAGE_KEY, "true");
  };

  if (!mounted) return null;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={() => {}}
        title="We value your privacy"
        disableClose
      >
        <div className="cookie-banner-body">
          <p className="cookie-banner-text">
            We use cookies to enhance your browsing experience and analyze site
            traffic. Please choose your preferences below.
          </p>
          <div className="cookie-banner-actions">
            <Button
              variant="primary"
              size="lg"
              block
              onClick={handleAcceptAll}
            >
              Accept all
            </Button>
            <Button
              variant="secondary"
              size="lg"
              block
              onClick={handleCustomize}
            >
              Customise
            </Button>
          </div>
          <p className="cookie-banner-footer">
            By choosing, you agree to our{" "}
            <a
              href="https://sagelga.com/cookie-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="cookie-banner-link"
            >
              Cookie Policy
            </a>{" "}
            and{" "}
            <a
              href="https://sagelga.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="cookie-banner-link"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </BottomSheet>

      <CookieSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />
    </>
  );
}
