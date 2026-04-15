// footer.ts
//
// Defines the shared footer content for every sagelga project.
//
// Footer columns follow a consistent 4-column layout across all sagelga sites:
//   Col 1 — project-specific primary links (defined per site, not here)
//   Col 2 — project meta: GitHub, feedback, changelog (makeProjectMetaColumn)
//   Col 3 — sagelga brand ecosystem, shared across all sites (SAGELGA_COLUMN)
//   Col 4 — external social profiles, shared across all sites (SAGELGA_SOCIALS_COLUMN)
//
// Cols 3 and 4 are intentionally identical on every sagelga project — do not
// customise them per site. Col 2 is generated via makeProjectMetaColumn so
// the GitHub links resolve to the correct repo.

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

// A single column in the footer, consisting of a heading and its links.
interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/**
 * Footer column standard — 4 columns, always in this order:
 *
 *  Col 1  [Project A]   — primary project content (features, main pages)
 *  Col 2  [Project B]   — secondary project content (meta: GitHub, status, privacy…)
 *  Col 3  sagelga       — brand ecosystem, identical across every site  ← SAGELGA_COLUMN
 *  Col 4  Connect       — external social profiles, identical across every site  ← SAGELGA_SOCIALS_COLUMN
 */

// ── Col 3: sagelga brand ─────────────────────────────────────────────────────
// Core ecosystem links. Same on every sagelga project — do not customise per site.

export const SAGELGA_COLUMN: FooterColumn = {
  title: "sagelga",
  links: [
    { label: "sagelga.com", href: "https://sagelga.com", external: true },
    { label: "Learn", href: "https://learn.sagelga.com", external: true },
    { label: "Documentation", href: "https://docs.sagelga.com", external: true },
  ],
};

// ── Col 4: Connect ───────────────────────────────────────────────────────────
// External social / professional profiles. Same on every sagelga project.

export const SAGELGA_SOCIALS_COLUMN: FooterColumn = {
  title: "Connect",
  links: [
    { label: "GitHub", href: "https://github.com/sagelga", external: true },
    { label: "LinkedIn", href: "https://linkedin.com/in/kunanon", external: true },
  ],
};

// ── Col 2 helper: project meta ───────────────────────────────────────────────
// Generates the second project column for open-source projects.
// Pass the GitHub repo slug, e.g. "sagelga/mahjong-hands".

export function makeProjectMetaColumn(githubRepo: string): FooterColumn {
  return {
    title: "Project",
    links: [
      { label: "GitHub", href: `https://github.com/${githubRepo}`, external: true },
      { label: "Feedback", href: `https://github.com/${githubRepo}/issues`, external: true },
      { label: "Changelog", href: `https://github.com/${githubRepo}/releases`, external: true },
      { label: "System Status", href: "https://status.sagelga.com", external: true },
      { label: "Privacy Policy", href: "https://sagelga.com/privacy-policy", external: true },
    ],
  };
}
