import type { Metadata } from "next";
import { ThemeProvider } from "@/hooks/useTheme";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieConsentBanner from "@/components/cookies/CookieConsentBanner";
import { NavItem } from "@/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Deduplicate",
  description: "Find and delete duplicate Notion pages",
};

const NAV_LINKS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`body { --font-inter: 'Inter', ui-sans-serif, system-ui, sans-serif; }`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme-preference');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else if (t === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <Navbar
            brandName="Notion Deduplicate"
            navbarBg="#4f46e5"
            links={NAV_LINKS}
          />
          <main className="page-content">
            {children}
          </main>
          <Footer
            copyrightStart={2025}
          />
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
