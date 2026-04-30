// layout.tsx
//
// Root layout for the entire Next.js app. Wraps every page with:
//   - ThemeProvider  — manages light/dark/system theme
//   - DedupProvider  — global dedup session state (survives navigation)
//   - Navbar / Footer — persistent chrome
//   - CookieConsentBanner — GDPR/cookie consent UI
//
// The inline <Script strategy="beforeInteractive"> block prevents a flash of
// wrong theme (FOUT) by reading localStorage and setting data-theme on <html>
// before React hydrates. This runs synchronously before any CSS/JS is parsed.
//
// suppressHydrationWarning on <html> is required because the blocking script
// may set data-theme before React hydrates, causing a mismatch that React would
// otherwise warn about.

import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/hooks/useTheme";
import { DedupProvider } from "@/hooks/useDedup";
import { LanguageProvider } from "@/hooks/useLanguage";
import Navbar, { SettingsGear } from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieConsentBanner from "@/components/cookies/CookieConsentBanner";
import "./globals.css";

interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
  disabled?: boolean;
}

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "notion-tools",
  description: "A growing collection of tools to help you work smarter in Notion",
};

const NAV_LINKS: NavItem[] = [
  { label: "Duplicate", href: "/duplicate" },
  { label: "Agenda", href: "/agenda" },
  { label: "Course", href: "/course" },
  { label: "Blog", href: "/blog" },
  { label: "Marketplace", href: "/marketplace" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
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
        <ThemeProvider>
          <DedupProvider>
            <LanguageProvider>
              <Navbar
                brandName="notion-tools"
                links={NAV_LINKS}
                controls={<SettingsGear />}
              />
              <main className="page-content">
                {children}
              </main>
              <Footer />
              <CookieConsentBanner />
            </LanguageProvider>
          </DedupProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
