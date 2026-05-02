import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — notion-tools",
  description: "Manage your account and preferences for notion-tools.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}