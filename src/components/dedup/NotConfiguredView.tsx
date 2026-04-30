// NotConfiguredView.tsx
//
// Shown on /duplicate and /agenda when the user has not configured their
// Notion integration token. Displays a card with an icon, message, and
// a button to navigate to the settings page.

"use client";

import { useRouter } from "next/navigation";
import { Key, Settings } from "lucide-react";
import "./NotConfiguredView.css";

interface NotConfiguredViewProps {
  title?: string;
  description?: string;
}

export default function NotConfiguredView({
  title = "Notion API key not configured",
  description = "Connect your Notion integration to use this feature.",
}: NotConfiguredViewProps) {
  const router = useRouter();

  return (
    <div className="not-configured">
      <div className="not-configured__card">
        <div className="not-configured__icon-wrapper">
          <Key size={36} className="not-configured__icon" />
        </div>
        <h2 className="not-configured__title">{title}</h2>
        <p className="not-configured__desc">{description}</p>
        <button
          onClick={() => router.push("/settings")}
          className="not-configured__cta"
        >
          <Settings size={16} />
          Go to Settings
        </button>
      </div>
    </div>
  );
}