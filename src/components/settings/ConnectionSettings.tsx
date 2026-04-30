// ConnectionSettings.tsx
//
// Notion integration token management section for the Settings page.
// Shows a token input with validation, a status chip (connected/disconnected),
// and a 6-step carousel tutorial for first-time setup. When connected, shows
// the status chip and a disconnect button. On successful connect, redirects
// to /duplicate.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface Step {
  description: React.ReactNode;
  image?: string;
  critical?: boolean;
}

const steps: Step[] = [
  {
    description: (
      <>
        Go to{" "}
        <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">
          notion.so/my-integrations
        </a>{" "}
        → click <strong>Create a new integration</strong>.
      </>
    ),
    image: "/images/step-5-database-connections.png",
  },
  {
    description: (
      <>
        Fill in the integration <strong>name</strong> and select the <strong>associated workspace</strong>.
      </>
    ),
    image: "/images/step-2-copy-token.png",
  },
  {
    description: (
      <>
        Click the <strong>Content access</strong> tab at the top of the integration settings.
      </>
    ),
    image: "/images/step-6-alternative-connection.png",
  },
  {
    description: (
      <>
        Click <strong>Edit access</strong> to open the page and database selection modal.
      </>
    ),
    image: "/images/step-3-content-access.png",
  },
  {
    description: (
      <>
        Search for or type the <strong>database name</strong> and select it to grant the integration access.
      </>
    ),
    image: "/images/step-4-manage-page-access.png",
    critical: true,
  },
  {
    description: (
      <>
        Copy the <strong>Internal integration secret</strong> (<code>secret_…</code> or <code>ntn_…</code>) from the <strong>Configuration</strong> tab.
      </>
    ),
    image: "/images/step-1-create-integration.png",
  },
];

export default function ConnectionSettings() {
  const { token, setToken, clearToken } = useNotionToken();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isConnected = !!token;

  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentStep((s) => Math.min(steps.length - 1, s + 1));

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

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
    router.push("/duplicate");
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

      {!isConnected && (
        <>
          {/* 6-step tutorial carousel */}
          <div className="connection-stepper">
            <p className="connection-stepper-header">How to set up your Notion integration</p>
            <div className="flex flex-col gap-3">
              {/*
                Grid overlay: all descriptions occupy the same grid cell ([grid-area:1/1]).
                The grid auto-sizes to the tallest step, so the container height never
                changes as you navigate. Only the active step is visible; the rest are
                invisible but still in flow, holding the space open.
              */}
              <div className="grid">
                {steps.map((s, i) => (
                  <p
                    key={i}
                    className={`[grid-area:1/1] connection-step-description ${s.critical ? "critical" : ""} ${i !== currentStep ? "invisible" : ""}`}
                  >
                    {s.description}
                  </p>
                ))}
              </div>
              {step.image && (
                <div className="flex h-[220px] shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--color-canvas)]">
                  <img src={step.image} alt={`Step ${currentStep + 1}`} className="connection-step-image" />
                </div>
              )}
            </div>

            <div className="connection-stepper-nav">
              <Button
                variant="secondary"
                onClick={goPrev}
                disabled={isFirst}
              >
                ← Prev
              </Button>
              <span className="connection-stepper-dots">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`connection-stepper-dot ${i === currentStep ? "active" : ""}`}
                    onClick={() => setCurrentStep(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setCurrentStep(i);
                    }}
                  />
                ))}
              </span>
              <Button
                variant="secondary"
                onClick={goNext}
                disabled={isLast}
              >
                Next →
              </Button>
            </div>
          </div>

          {/* Token input + connect */}
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
            </div>
          </form>
        </>
      )}

      {isConnected && (
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
              Update Token
            </Button>
            <button
              type="button"
              className="connection-btn connection-btn-danger"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        </form>
      )}
    </div>
  );
}