"use client";

import React from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/types";
import "./ThemeSettingsModal.css";

interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SunIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Always use the light theme",
    icon: <SunIcon />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    icon: <MoonIcon />,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device preference",
    icon: <MonitorIcon />,
  },
];

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme, setTheme } = useTheme();

  const handleSelect = (value: Theme) => {
    setTheme(value);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Theme">
      <div className="theme-settings-list">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`theme-option${theme === option.value ? " active" : ""}`}
            onClick={() => handleSelect(option.value)}
          >
            <span className="theme-option-icon">{option.icon}</span>
            <span className="theme-option-content">
              <span className="theme-option-label">{option.label}</span>
              <span className="theme-option-description">
                {option.description}
              </span>
            </span>
            {theme === option.value && (
              <span className="theme-option-check">
                <CheckIcon />
              </span>
            )}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
};

export default ThemeSettingsModal;
