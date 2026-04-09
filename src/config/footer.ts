import { FooterColumn } from "@/types";

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
