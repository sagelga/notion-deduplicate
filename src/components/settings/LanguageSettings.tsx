// LanguageSettings.tsx
//
// Language selector for the Settings page. Currently supports English and
// Thai. Each option is a full-width row with a language name and a radio
// indicator showing the current selection.

"use client";

import React from "react";
import { useLanguage, Language } from "@/hooks/useLanguage";
import "./LanguageSettings.css";

const LANGUAGES: Array<{
  value: Language;
  label: string;
  nativeLabel: string;
}> = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "th", label: "Thai", nativeLabel: "ภาษาไทย" },
];

export default function LanguageSettings() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-settings">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          className={`language-option${language === lang.value ? " active" : ""}`}
          onClick={() => setLanguage(lang.value)}
          type="button"
        >
          <span className="language-option-content">
            <span className="language-option-label">{lang.label}</span>
            <span className="language-option-native">{lang.nativeLabel}</span>
          </span>
          <span className="language-option-radio">
            <span className="language-option-radio-dot" />
          </span>
        </button>
      ))}
    </div>
  );
}
