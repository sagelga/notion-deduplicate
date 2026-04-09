"use client";

import { useState, useMemo } from "react";
import "./page.css";

export const runtime = 'edge';

const TEMPLATES = [
  {
    id: "weekly-planner",
    name: "Weekly Planner",
    category: "Productivity",
    description:
      "Plan your week with a simple table: tasks, priorities, and a Friday review section built in.",
    emoji: "📅",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    featured: true,
    trending: true,
    href: "#",
  },
  {
    id: "reading-list",
    name: "Reading List",
    category: "Knowledge",
    description:
      "Track books, articles, and papers with status, notes, and a star rating — all in one database.",
    emoji: "📚",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    featured: true,
    trending: false,
    href: "#",
  },
  {
    id: "project-tracker",
    name: "Project Tracker",
    category: "Work",
    description:
      "Manage projects with milestones, owners, and a Kanban board view. Works for solo and team use.",
    emoji: "📊",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    featured: true,
    trending: true,
    href: "#",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    category: "Work",
    description:
      "A template page for meeting notes with sections for agenda, decisions, and action items.",
    emoji: "📝",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    featured: false,
    trending: false,
    href: "#",
  },
  {
    id: "personal-dashboard",
    name: "Personal Dashboard",
    category: "Productivity",
    description:
      "Your home base in Notion — quick links, a daily task inbox, goals, and a habit tracker.",
    emoji: "🏠",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    featured: false,
    trending: true,
    href: "#",
  },
];

const CATEGORIES = ["All", "Productivity", "Knowledge", "Work"];
const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Trending", value: "trending" },
  { label: "A-Z", value: "alphabetical" },
  { label: "Category", value: "category" },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");

  const filtered = useMemo(() => {
    let result = [...TEMPLATES];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (category !== "All") {
      result = result.filter((t) => t.category === category);
    }

    // Sort
    switch (sort) {
      case "featured":
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case "trending":
        result.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
        break;
      case "alphabetical":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "category":
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return result;
  }, [search, category, sort]);

  const featuredItems = TEMPLATES.filter((t) => t.featured);

  return (
    <div className="mkt-wrapper">
      {/* Hero */}
      <div className="mkt-hero">
        <h1 className="mkt-title">Free Notion Templates</h1>
        <p className="mkt-subtitle">
          Browse, preview, and duplicate templates directly into your Notion workspace.
        </p>
      </div>

      {/* Control bar */}
      <div className="mkt-controls">
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mkt-search"
        />
        <div className="mkt-filters">
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mkt-select"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="mkt-filter-group">
            <label className="mkt-filter-label">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mkt-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Featured section */}
      {!search && category === "All" && sort === "featured" && (
        <div className="mkt-featured">
          <h2 className="mkt-section-label">✨ Featured Templates</h2>
          <div className="mkt-featured-grid">
            {featuredItems.map((tpl) => (
              <a
                key={tpl.id}
                href={tpl.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mkt-featured-card"
              >
                <div className="mkt-featured-preview" style={{ background: tpl.gradient }}>
                  <span className="mkt-featured-emoji">{tpl.emoji}</span>
                </div>
                <div className="mkt-featured-info">
                  <span className="mkt-badge">Featured</span>
                  <h3 className="mkt-featured-name">{tpl.name}</h3>
                  <p className="mkt-featured-desc">{tpl.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="mkt-section">
        <h2 className="mkt-section-label">
          {filtered.length} Template{filtered.length !== 1 ? "s" : ""}
        </h2>
        <div className="mkt-grid">
          {filtered.map((tpl) => (
            <a
              key={tpl.id}
              href={tpl.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mkt-card"
            >
              <div className="mkt-card-preview" style={{ background: tpl.gradient }}>
                <span className="mkt-card-emoji">{tpl.emoji}</span>
                {tpl.trending && <span className="mkt-card-badge">🔥 Trending</span>}
              </div>
              <div className="mkt-card-body">
                <span className="mkt-card-category">{tpl.category}</span>
                <h2 className="mkt-card-name">{tpl.name}</h2>
                <p className="mkt-card-desc">{tpl.description}</p>
              </div>
              <div className="mkt-card-footer">
                <span className="mkt-card-btn">Duplicate to Notion →</span>
              </div>
            </a>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="mkt-empty">
            <p className="mkt-empty-text">No templates match your search.</p>
            <button
              className="mkt-empty-reset"
              onClick={() => {
                setSearch("");
                setCategory("All");
                setSort("featured");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
