import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agenda — Task & Calendar View for Notion",
  description:
    "Manage your tasks and calendar with Agenda view for Notion. Sync your Notion databases, view upcoming tasks, and organize your schedule.",
  alternates: {
    canonical: "/agenda",
  },
};

export default function AgendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}