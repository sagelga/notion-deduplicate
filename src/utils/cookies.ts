import { CookiePreferences, COOKIE_STORAGE_KEY } from "@/types";

const DEFAULT_PREFERENCES: CookiePreferences = {
  functional: true,
  analytics: false,
  consentGiven: false,
  consentTimestamp: null,
};

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as CookiePreferences;
  } catch {
    console.warn("Failed to parse cookie preferences");
  }
  return DEFAULT_PREFERENCES;
}

export function setCookiePreferences(preferences: CookiePreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    console.warn("Failed to save cookie preferences");
  }
}

export function hasConsent(): boolean {
  return getCookiePreferences().consentGiven;
}

export function hasAnalyticsConsent(): boolean {
  const prefs = getCookiePreferences();
  return prefs.consentGiven && prefs.analytics;
}

export function clearCookiePreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
  } catch {
    console.warn("Failed to clear cookie preferences");
  }
}
