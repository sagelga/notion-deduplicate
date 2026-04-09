"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./SetupForm.css";

export default function SetupForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setLoading(false);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: "Unknown error" }));
      setError(msg || "Failed to save token");
      return;
    }

    router.push("/dashboard");
  }

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

      <ol className="setup-hint setup-steps">
        <li>
          Go to{" "}
          <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">
            notion.so/my-integrations
          </a>{" "}
          → click <strong>New integration</strong> → give it any name.
        </li>
        <li>
          Copy the <strong>Internal Integration Token</strong> (<code>secret_…</code> or <code>ntn_…</code>).
        </li>
        <li className="setup-steps-critical">
          In Notion, open each database → click <strong>···</strong> (top-right) →{" "}
          <strong>Connections</strong> → add your integration.{" "}
          Without this step, the database list will be empty.
        </li>
      </ol>

      <button type="submit" disabled={loading} className="setup-submit-btn">
        {loading ? "Connecting…" : "Connect"}
      </button>
    </form>
  );
}
