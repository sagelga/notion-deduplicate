// useTheme.tsx
//
// React context that manages light/dark/system theme for the entire app.
//
// Three-value theme model:
//   "light"  — always use light mode regardless of OS preference
//   "dark"   — always use dark mode regardless of OS preference
//   "system" — follow the OS/browser prefers-color-scheme media query
//
// The resolved theme (always "light" | "dark") drives the data-theme attribute
// on <html>, which CSS variables key off of.
//
// A flash-of-wrong-theme (FOUT) is prevented by a blocking inline <Script> in
// layout.tsx that reads localStorage and sets data-theme before React hydrates.
// The mounted flag in this file ensures we never write data-theme on the server
// (where window is undefined) and don't overwrite the blocking script's value
// until the client is fully hydrated.

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// "system" delegates to the OS/browser prefers-color-scheme media query.
type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme-preference";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // SSR guard — return a safe default on the server/edge.
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    // Validate the stored value to guard against stale/invalid localStorage data.
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
    return "system";
  });

  const [systemPreference, setSystemPreference] = useState<"light" | "dark">(
    () => {
      // Default to "dark" on SSR — the blocking script in layout.tsx handles
      // the real value before hydration, so this only affects the initial React state.
      if (typeof window === "undefined") return "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
  );

  // Tracks whether the component has mounted on the client. Prevents writing
  // data-theme during SSR or before hydration completes.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Subscribe to OS-level theme changes so the app updates in real time if
    // the user switches system appearance while the tab is open.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setSystemPreference(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Collapse the three-value theme to a concrete "light" | "dark" value that
  // the rest of the app (and CSS) can act on directly.
  const resolvedTheme = theme === "system" ? systemPreference : theme;

  useEffect(() => {
    // Skip DOM manipulation until the component is mounted on the client.
    if (!mounted) return;
    const html = document.documentElement;
    if (resolvedTheme === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.setAttribute("data-theme", "light");
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, resolvedTheme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Cycles through light → dark → system → light. This gives users a single
  // button to step through all three modes in a predictable order.
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};
