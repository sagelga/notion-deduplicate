"use client";

import React from "react";
import Link from "next/link";
import { NavItem } from "@/types";
import "./Navbar.css";

interface NavbarProps {
  /** Brand/logo text shown in top-left */
  brandName: string;
  /** Where the brand logo links to (default: "/") */
  brandHref?: string;
  /** Navigation items */
  links?: NavItem[];
  /** Optional slot for extra controls in the top-right (e.g. search, user avatar) */
  controls?: React.ReactNode;
}

export default function Navbar({
  brandName,
  brandHref = "/",
  links,
  controls,
}: NavbarProps) {

  return (
    <nav className="navbar">
      <div className="nav-top-inner">
        <Link href={brandHref} className="nav-logo-text">
          {brandName}
        </Link>
        {links && links.length > 0 && (
          <div className="nav-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {controls && <div className="nav-top-right">{controls}</div>}
      </div>
    </nav>
  );
}
