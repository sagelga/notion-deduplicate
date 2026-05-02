import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn Notion — Free Guides & Tutorials",
  description:
    "Practical guides to help you and your team get more out of Notion. Learn databases, templates, collaboration, and integrations.",
  alternates: {
    canonical: "/course",
  },
};

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}