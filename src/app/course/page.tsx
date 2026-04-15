// page.tsx — Course page (/course)
//
// Static marketing page listing Notion learning topics. No dynamic data —
// content is hardcoded in SECTIONS below. The edge runtime declaration is
// required for consistency with the rest of the app on Cloudflare Pages even
// though this route does not use cookies or fetch.

import Link from "next/link";
import "./page.css";

export const runtime = 'edge';

// Each item renders as a numbered card. Order here determines display order.
const SECTIONS = [
  {
    title: "Getting Started",
    description:
      "What is Notion, how workspaces work, and how to create your first pages and blocks.",
  },
  {
    title: "Databases & Views",
    description:
      "The core of Notion's power — learn how to build databases, switch between table, board, calendar, and gallery views, and filter your data.",
  },
  {
    title: "Templates",
    description:
      "How to use built-in templates and create your own reusable page templates to save time.",
  },
  {
    title: "Collaboration & Permissions",
    description:
      "Share pages with teammates, manage access levels, leave comments, and work together in real time.",
  },
  {
    title: "Integrations",
    description:
      "Connect Notion to the tools you already use — and learn how notion-tools can help you keep your workspace clean.",
  },
];

export default function CoursePage() {
  return (
    <div className="course-wrapper">
      <div className="course-hero">
        <h1 className="course-title">Learn Notion</h1>
        <p className="course-subtitle">
          Practical guides to help you and your team get more out of Notion.
        </p>
      </div>

      <div className="course-sections">
        {SECTIONS.map((section, i) => (
          <div key={section.title} className="course-section-card">
            {/* Zero-padded number label: "01", "02", etc. */}
            <span className="course-section-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="course-section-body">
              <h2 className="course-section-title">{section.title}</h2>
              <p className="course-section-desc">{section.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="course-cta">
        <p className="course-cta-text">
          Ready to clean up your workspace?
        </p>
        <Link href="/duplicate" className="course-cta-btn">Try Duplicate</Link>
      </div>
    </div>
  );
}
