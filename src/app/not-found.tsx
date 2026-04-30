// not-found.tsx
// Rendered by Next.js whenever a route has no matching page.
// Styled to match the site's design tokens (globals.css) rather than using
// the default plain-text fallback.

"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import "./not-found.css";

export default function NotFound() {
  const router = useRouter();

  return (
    // Full-viewport centered layout defined in not-found.css
    <div className="notfound-wrapper">
      {/* Large faded number — decorative, not a heading */}
      <p className="notfound-code">404</p>

      <h1 className="notfound-title">Page not found</h1>

      <p className="notfound-desc">
        This page does not exist or may have been moved.
      </p>

      {/* Primary action: send the user back to a known-good route */}
      <Button variant="primary" onClick={() => router.push("/")}>
        Go home
      </Button>
    </div>
  );
}
