import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duplicate Finder — Find & Remove Duplicate Notion Pages",
  description:
    "Select a Notion database, pick a field to group by, and remove all but the newest copy — in seconds. Automated duplicate detection for Notion workspaces.",
  alternates: {
    canonical: "/duplicate",
  },
};

export default function DuplicateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}