// page.tsx — Landing page (/)
//
// Server component that renders the public homepage.
// Checks whether the user already has a Notion token cookie to decide whether
// to show the SetupForm (connect token) or a "Go to Duplicate" shortcut.
//
// Must be an edge runtime route because it reads cookies(), which requires
// the edge runtime on Cloudflare Pages.

import { cookies } from "next/headers";
import Link from "next/link";
import "./page.css";

// Required for Cloudflare Pages — all routes that use cookies() must opt into
// the edge runtime explicitly.
export const runtime = 'edge';

const TOOLS = [
  {
    label: "Duplicate",
    href: "/duplicate",
    description: "Find and remove duplicate pages from any Notion database.",
  },
  {
    label: "Course",
    href: "/course",
    description: "Step-by-step guides to help you master Notion from scratch.",
  },
  {
    label: "Blog",
    href: "/blog",
    description: "Tips, workflows, and ideas for Notion power users.",
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    description: "Free Notion templates you can duplicate and use today.",
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  // A truthy notion_token cookie means the user has already pasted their
  // integration token via SetupForm — show a shortcut instead of the form.
  const isConnected = !!cookieStore.get("notion_token")?.value;

  return (
    <div className="landing-wrapper">
      {/* Hero */}
      <section className="landing-hero">
        <h1 className="landing-hero-title">notion-tools</h1>
        <p className="landing-hero-subtitle">
          Find and remove duplicate pages from your Notion databases — fast, private, and free.
        </p>
        <ol className="landing-how-it-works">
          <li>Connect your Notion integration token</li>
          <li>Select a database</li>
          <li>Review and delete duplicates</li>
        </ol>
      </section>

      {/* Tools grid */}
      <section className="landing-tools">
        <h2 className="landing-section-label">Tools</h2>
        <div className="landing-tools-grid">
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="landing-tool-card">
              <span className="landing-tool-name">{tool.label}</span>
              <span className="landing-tool-desc">{tool.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
