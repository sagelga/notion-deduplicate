// cookies.ts
//
// Utility functions for reading and writing user cookie consent preferences.
// Preferences are persisted in localStorage (not actual HTTP cookies) because
// they need to be accessible in client-side code without a round-trip to the
// server.
//
// All functions guard against SSR/edge execution by checking for window before
// accessing localStorage.

// Shape of the cookie consent record stored in localStorage.
// consentTimestamp is null until the user has interacted with the banner.
interface CookiePreferences {
  functional: boolean;
  analytics: boolean;
  consentGiven: boolean;
  consentTimestamp: number | null;
}

export const COOKIE_STORAGE_KEY = "cookie-preferences";

// Functional cookies are always enabled by default (required for the app to work).
// Analytics are opt-in and default to false until the user explicitly consents.
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

// Both conditions must be true: the user must have clicked "Accept" (consentGiven)
// AND have opted into analytics specifically. Consent can be given while
// analytics is still off (e.g. "Accept necessary only").
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
