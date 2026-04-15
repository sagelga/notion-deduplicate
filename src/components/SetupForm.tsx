// SetupForm.tsx
//
// The initial onboarding form where the user pastes their Notion integration token.
// This is the primary authentication entry point — there is no OAuth sign-in on the
// main path. The token is validated client-side, saved to localStorage via useNotionToken,
// and the user is redirected to /duplicate.
//
// The form also includes step-by-step instructions explaining how to create a Notion
// integration and — critically — how to connect it to specific databases (the most
// common setup mistake).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotionToken } from "@/hooks/useNotionToken";
import "./SetupForm.css";

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

export default function SetupForm() {
  const router = useRouter();
  const { setToken: saveToken } = useNotionToken();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  function validateToken(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "Token is required.";
    if (!/^(secret_|ntn_)/.test(trimmed)) return "Token must start with secret_ or ntn_.";
    if (trimmed.length < 20) return "Token looks too short — double-check you copied the full value.";
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateToken(token);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    saveToken(token.trim());
    router.push("/duplicate");
  }

  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentStep((s) => Math.min(steps.length - 1, s + 1));

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      <div className="setup-field">
        <label className="setup-label">Notion Integration Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="secret_... or ntn_..."
          required
          className="setup-input"
        />
      </div>

      {error && <p className="setup-error">{error}</p>}

      <div className="setup-stepper">
        <p className="setup-stepper-header">How to set up your Notion integration</p>
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
                className={`[grid-area:1/1] setup-step-description ${s.critical ? "critical" : ""} ${i !== currentStep ? "invisible" : ""}`}
              >
                {s.description}
              </p>
            ))}
          </div>
          {/* Image wrapper: fixed height — never changes regardless of description length */}
          {step.image && (
            <div className="flex h-[220px] shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--color-canvas)]">
              <img src={step.image} alt={`Step ${currentStep + 1}`} className="setup-step-image" />
            </div>
          )}
        </div>

        <div className="setup-stepper-nav">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className="setup-stepper-btn"
          >
            ← Prev
          </button>
          <span className="setup-stepper-dots">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`setup-stepper-dot ${i === currentStep ? "active" : ""}`}
                onClick={() => setCurrentStep(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setCurrentStep(i);
                }}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={isLast}
            className="setup-stepper-btn"
          >
            Next →
          </button>
        </div>
      </div>

      <button type="submit" className="setup-submit-btn">
        Connect
      </button>
    </form>
  );
}
