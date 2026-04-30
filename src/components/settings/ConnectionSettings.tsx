// ConnectionSettings.tsx
//
// Notion integration token management section for the Settings page.
// Shows a token input with validation, a status chip (connected/disconnected),
// and a disconnect button when a token is present. Shares validation logic
// with the original SetupForm but stripped of the multi-step onboarding UI.

"use client";

import { useState } from "react";
import { useNotionToken } from "@/hooks/useNotionToken";
import { Button } from "@/components/ui";
import "./ConnectionSettings.css";

function validateToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Token is required.";
  if (!/^(secret_|ntn_)/.test(trimmed))
    return "Token must start with secret_ or ntn_.";
  if (trimmed.length < 20)
    return "Token looks too short — double-check you copied the full value.";
  return "";
}

export default function ConnectionSettings() {
  const { token, setToken, clearToken } = useNotionToken();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!token;

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateToken(inputValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setToken(inputValue.trim());
    setInputValue("");
  }

  function handleDisconnect() {
    clearToken();
    setInputValue("");
  }

  return (
    <div className="connection-settings">
      <div className="connection-status">
        <div className="connection-status-chip">
          <span
            className={`connection-status-dot ${isConnected ? "connected" : "disconnected"}`}
          />
          <span className="connection-status-label">
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>
      </div>

      <form onSubmit={handleConnect} className="connection-form">
        <div className="connection-field">
          <label className="connection-label">
            Notion Integration Token
          </label>
          <div className="connection-input-row">
            <input
              type={showToken ? "text" : "password"}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              placeholder="secret_... or ntn_..."
              className="connection-input"
            />
            <button
              type="button"
              className="connection-toggle-visibility"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <p className="connection-error">{error}</p>}

        <div className="connection-actions">
          <Button variant="primary" type="submit">
            Connect
          </Button>
          {isConnected && (
            <button
              type="button"
              className="connection-btn connection-btn-danger"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
