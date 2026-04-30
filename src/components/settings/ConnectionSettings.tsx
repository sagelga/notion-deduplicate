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
import { Button, Input, Card, CardBody } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "./ConnectionIcons";
import { ConnectionStatus } from "./ConnectionStatus";
import { SetupCarousel } from "./SetupCarousel";
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

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string;
  showToken: boolean;
  onToggleVisibility: () => void;
}

function TokenInput({ value, onChange, error, showToken, onToggleVisibility }: TokenInputProps) {
  return (
    <div className="connection-input-row">
      <Input
        type={showToken ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="secret_... or ntn_..."
        variant="mono"
        error={error}
        className="connection-input"
      />
      <button
        type="button"
        className="connection-toggle-visibility"
        onClick={onToggleVisibility}
        aria-label={showToken ? "Hide token" : "Show token"}
      >
        {showToken ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

interface TokenFormProps {
  onConnect: (token: string) => void;
  onDisconnect?: () => void;
  isConnected: boolean;
}

function TokenForm({ onConnect, onDisconnect, isConnected }: TokenFormProps) {
  const { setToken } = useNotionToken();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateToken(inputValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    const trimmed = inputValue.trim();
    setToken(trimmed);
    setInputValue("");
    onConnect(trimmed);
  };

  const handleDisconnect = () => {
    setInputValue("");
    onDisconnect?.();
  };

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="connection-form">
          <div className="connection-field">
            <label className="connection-label">Notion Integration Token</label>
            <TokenInput
              value={inputValue}
              onChange={(val) => {
                setInputValue(val);
                setError("");
              }}
              error={error}
              showToken={showToken}
              onToggleVisibility={() => setShowToken((v) => !v)}
            />
          </div>
          <div className="connection-actions">
            <Button variant="primary" type="submit">
              {isConnected ? "Update Token" : "Connect"}
            </Button>
            {isConnected && onDisconnect && (
              <Button variant="secondary" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default function ConnectionSettings() {
  const { token, clearToken } = useNotionToken();
  const router = useRouter();
  const isConnected = !!token;

  const handleConnect = () => router.push("/duplicate");

  return (
    <div className="connection-settings">
      <ConnectionStatus isConnected={isConnected} />

      {!isConnected && <SetupCarousel />}

      <TokenForm
        onConnect={handleConnect}
        onDisconnect={clearToken}
        isConnected={isConnected}
      />
    </div>
  );
}
