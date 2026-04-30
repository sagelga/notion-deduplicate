// page.tsx — Landing page (/)
//
// Server component. Checks for an existing Notion token cookie so the CTA
// can route directly to /duplicate for already-connected users.

import { cookies } from "next/headers";
import Link from "next/link";
import { PageIllustration } from "@/components/ui/PageIllustration";
import "./page.css";

export const runtime = "edge";

const HOW_IT_WORKS = [
  { n: "01", title: "Connect", sub: "OAuth token, httpOnly cookie" },
  { n: "02", title: "Configure", sub: "Pick DB + field to group by" },
  { n: "03", title: "Scan", sub: "Streams pages in real-time" },
  { n: "04", title: "Delete", sub: "Keeps newest, removes the rest" },
];

const TOOLS = [
  { label: "Course",      href: "/course",      description: "Step-by-step guides to master Notion from scratch." },
  { label: "Blog",        href: "/blog",         description: "Tips, workflows, and ideas for Notion power users." },
  { label: "Marketplace", href: "/marketplace",  description: "Free Notion templates you can duplicate and use today." },
];

export default async function Home() {
  const cookieStore = await cookies();
  const isConnected = !!cookieStore.get("notion_token")?.value;

  return (
    <div className="landing-wrapper">
      {/* ── Hero (S1) ── */}
      <section className="landing-hero">
        <div className="landing-hero-left">
          <p className="landing-eyebrow">notion-tools · deduplication</p>
          <h1 className="landing-hero-title">
            Clean up duplicate<br />Notion pages.
          </h1>
          <p className="landing-hero-subtitle">
            Select a database, pick a field to group by, and remove all but the
            newest copy — in seconds.
          </p>
          <div className="landing-cta-row">
            <Link
              href={isConnected ? "/duplicate" : "/duplicate"}
              className="landing-cta-btn"
            >
              {isConnected ? "Go to Duplicate →" : "Connect with Notion →"}
            </Link>
            <span className="landing-trust-note">OAuth · no data stored</span>
          </div>

          {/* How it works */}
          <div className="landing-how-it-works">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="landing-step">
                <span className="landing-step-n">{step.n}</span>
                <span className="landing-step-title">{step.title}</span>
                <span className="landing-step-sub">{step.sub}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-right">
          <PageIllustration />
        </div>
      </section>

      {/* ── Other tools ── */}
      <section className="landing-tools">
        <h2 className="landing-section-label">More tools</h2>
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
