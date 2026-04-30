// useLanguage.tsx
//
// Lightweight context that stores the user's preferred display language
// in localStorage. Currently supports "en" and "th"; the hook is i18n-ready
// but actual translated strings are out of scope.
//
// The mounted guard follows the same pattern as useTheme/useNotionToken:
// it prevents SSR writes and hydration mismatches from localStorage reads.

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "en" | "th";
export const LANGUAGE_STORAGE_KEY = "language-preference";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Lazy-initialize from localStorage — no effect needed, no cascading render.
  // On SSR the function returns "en" (safe default); on client it reads once.
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (stored === "en" || stored === "th") return stored;
    return "en";
  });

  // Write to localStorage whenever language changes. React guarantees this
  // effect runs after the browser paints, so it does not cause a flash.
  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};
