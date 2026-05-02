import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Notion Templates — Marketplace",
  description:
    "Browse, preview, and duplicate free Notion templates directly into your workspace. Weekly Planner, Reading List, Project Tracker, and more.",
  alternates: {
    canonical: "/marketplace",
  },
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}