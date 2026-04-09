import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/hooks/useTheme";
import { DedupProvider } from "@/hooks/useDedup";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CookieConsentBanner from "@/components/cookies/CookieConsentBanner";
import { NavItem } from "@/types";
import "./globals.css";

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
            <Navbar
              brandName="notion-tools"
              links={NAV_LINKS}
            />
            <main className="page-content">
              {children}
            </main>
            <Footer
              copyrightStart={2025}
            />
            <CookieConsentBanner />
          </DedupProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
