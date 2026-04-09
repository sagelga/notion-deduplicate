import { cookies } from "next/headers";
import Link from "next/link";
import SetupForm from "@/components/SetupForm";
import "./page.css";

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

      {/* Get started */}
      <section className="landing-start">
        <h2 className="landing-section-label">Get Started</h2>
        {isConnected ? (
          <div className="landing-connected">
            <p className="landing-connected-text">Your Notion account is connected.</p>
            <Link href="/duplicate" className="landing-cta-btn">Go to Duplicate</Link>
          </div>
        ) : (
          <div className="landing-setup">
            <p className="landing-setup-desc">
              Connect your Notion integration token to start using the tools.
            </p>
            <p className="landing-trust-note">
              Your token is saved only in your browser. We never store it.
            </p>
            <SetupForm />
          </div>
        )}
      </section>
    </div>
  );
}
