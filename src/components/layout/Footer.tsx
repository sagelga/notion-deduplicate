// Footer.tsx
//
// Application footer that houses:
//   - Copyright notice + FAQ link
//   - DedupProgressBottomSheet — the persistent floating dedup progress indicator
//
// DedupProgressBottomSheet is rendered here (rather than in the page layout)
// so it stays mounted across client-side navigations and doesn't lose its state
// when the user moves between pages during an active run.

"use client";

import React from "react";
import Link from "next/link";
import DedupProgressBottomSheet from "@/components/dedup/DedupProgressBottomSheet";
import "./Footer.css";

interface FooterProps {
  /** Optional: Year to show in copyright (default: 2024) */
  copyrightStart?: number;
}

export default function Footer({ copyrightStart = 2024 }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">
          © {copyrightStart} notion-tools
          <span className="footer-sep"> · </span>
          <Link href="/faq" className="footer-link">
            FAQ
          </Link>
        </span>
        <div className="footer-controls" />
      </div>
      <DedupProgressBottomSheet />
    </footer>
  );
}