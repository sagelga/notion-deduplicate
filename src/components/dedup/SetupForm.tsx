// SetupForm.tsx
//
// Minimal token-only form — used primarily by the OAuth callback flow.
// The carousel/tutorial has moved to ConnectionSettings on the Settings page.
// This component handles the case where a user lands on /duplicate via OAuth
// (though in practice OAuth now lands on /settings instead).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotionToken } from "@/hooks/useNotionToken";
import { Input } from "@/components/ui";
import "./SetupForm.css";

export default function SetupForm() {
  const router = useRouter();
  const { setToken: saveToken } = useNotionToken();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

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

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      <div className="setup-field">
        <label className="setup-label">Notion Integration Token</label>
        <Input
          type="password"
          variant="mono"
          value={token}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
          placeholder="secret_... or ntn_..."
          error={error}
        />
      </div>

      <button type="submit" className="setup-submit-btn">
        Connect
      </button>
    </form>
  );
}