"use client";

import { useRouter } from "next/navigation";
import { Key, Settings } from "lucide-react";
import Button from "@/components/ui/Button";
import "./MissingNotionToken.css";

export default function MissingNotionToken() {
  const router = useRouter();

  return (
    <div className="missing-token">
      <div className="missing-token__card">
        <div className="missing-token__icon-wrapper">
          <Key size={36} className="missing-token__icon" />
        </div>
        <h2 className="missing-token__title">Notion API key not configured</h2>
        <p className="missing-token__desc">Connect your Notion integration to use this feature.</p>
        <Button
          variant="primary"
          onClick={() => router.push("/settings")}
        >
          <Settings size={16} />
          Go to Settings
        </Button>
      </div>
    </div>
  );
}
