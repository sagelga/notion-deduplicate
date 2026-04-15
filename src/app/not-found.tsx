// not-found.tsx
// Rendered by Next.js whenever a route has no matching page.
// Styled to match the site's design tokens (globals.css) rather than using
// the default plain-text fallback.

import Link from "next/link";
import "./not-found.css";

export default function NotFound() {
  return (
    // Full-viewport centered layout defined in not-found.css
    <div className="notfound-wrapper">
      {/* Large faded number — decorative, not a heading */}
      <p className="notfound-code">404</p>

      <h1 className="notfound-title">Page not found</h1>

      <p className="notfound-desc">
        This page doesn&apos;t exist or may have been moved.
      </p>

      {/* Primary action: send the user back to a known-good route */}
      <Link href="/" className="notfound-home-btn">
        Go home
      </Link>
    </div>
  );
}
