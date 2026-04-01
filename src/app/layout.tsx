import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Deduplicate",
  description: "Find and delete duplicate Notion pages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
