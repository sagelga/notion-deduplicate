// useNotionToken.ts
//
// Manages the Notion integration token in localStorage using useSyncExternalStore.
//
// Token state semantics:
//   null  — SSR / before first client render (server snapshot)
//   ""    — hydrated, no token stored
//   "..." — hydrated, token present
//
// useSyncExternalStore is the correct React primitive for subscribing to an
// external store like localStorage. It avoids the setState-in-effect pattern:
//   - getServerSnapshot returns null (SSR guard)
//   - getSnapshot reads localStorage on the client
//   - setToken / clearToken dispatch a custom event so same-tab changes
//     trigger the subscription callback and cause a re-render

"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "notion:token";
const CHANGE_EVENT = "notion-token-change";

function subscribe(callback: () => void) {
  // storage fires when another tab changes localStorage; CHANGE_EVENT covers same-tab changes.
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// Client snapshot: current localStorage value, or "" if absent.
function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

// Server snapshot: null signals "not yet hydrated" to the consuming component.
function getServerSnapshot(): null {
  return null;
}

export function useNotionToken() {
  const token = useSyncExternalStore<string | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Sanitise and store the token, then signal same-tab subscribers.
  const setToken = useCallback((value: string) => {
    const clean = value.trim().replace(/[^\x20-\x7E]/g, "");
    localStorage.setItem(STORAGE_KEY, clean);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { token, setToken, clearToken };
}
