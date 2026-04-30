// page.tsx — Marketplace page (/marketplace)
//
// Client component that renders a browsable gallery of free Notion templates.
// Template data is static (hardcoded in TEMPLATES below) — there is no backend
// or CMS powering this page yet.
//
// UI features:
//   - Full-text search across template name and description
//   - Category filter ("All", "Productivity", "Knowledge", "Work")
//   - Sort by featured, trending, alphabetical, or category
//   - Featured section shown only when no filters are active (default view)
//
// The filtered/sorted list is computed with useMemo so it only recalculates
// when the search, category, or sort state changes — not on every render.

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

type SortValue = "featured" | "trending" | "alphabetical" | "category";
type Template = (typeof TEMPLATES)[number];

interface Filters {
  search: string;
  category: string;
  sort: SortValue;
}

function CardPreview({ template, size }: { template: Template; size: "featured" | "card" }) {
  return (
    <div
      className={size === "featured" ? "mkt-featured-preview" : "mkt-card-preview"}
      style={{ background: template.gradient }}
    >
      <span className={size === "featured" ? "mkt-featured-emoji" : "mkt-card-emoji"}>
        {template.emoji}
      </span>
      {size === "card" && template.trending && (
        <span className="mkt-card-badge">🔥 Trending</span>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <a
      href={template.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mkt-card"
    >
      <CardPreview template={template} size="card" />
      <div className="mkt-card-body">
        <span className="mkt-card-category">{template.category}</span>
        <h2 className="mkt-card-name">{template.name}</h2>
        <p className="mkt-card-desc">{template.description}</p>
      </div>
      <div className="mkt-card-footer">
        <span className="mkt-card-btn">Duplicate to Notion →</span>
      </div>
    </a>
  );
}

function FeaturedCard({ template }: { template: Template }) {
  return (
    <a
      href={template.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mkt-featured-card"
    >
      <CardPreview template={template} size="featured" />
      <div className="mkt-featured-info">
        <span className="mkt-badge">Featured</span>
        <h3 className="mkt-featured-name">{template.name}</h3>
        <p className="mkt-featured-desc">{template.description}</p>
      </div>
    </a>
  );
}

function ControlBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="mkt-controls">
      <input
        type="text"
        placeholder="Search templates..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="mkt-search"
      />
      <div className="mkt-filters">
        <div className="mkt-filter-group">
          <label className="mkt-filter-label">Category</label>
          <select
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
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
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value as SortValue })}
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
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="mkt-empty">
      <p className="mkt-empty-text">No templates match your search.</p>
      <button className="mkt-empty-reset" onClick={onReset}>
        Reset filters
      </button>
    </div>
  );
}

export default function MarketplacePage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "All",
    sort: "featured",
  });

  const filtered = useMemo(() => {
    let result = [...TEMPLATES];

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    if (filters.category !== "All") {
      result = result.filter((t) => t.category === filters.category);
    }

    switch (filters.sort) {
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
  }, [filters]);

  const featuredItems = useMemo(() => TEMPLATES.filter((t) => t.featured), []);

  const showFeatured = !filters.search && filters.category === "All" && filters.sort === "featured";

  const resetFilters = () =>
    setFilters({ search: "", category: "All", sort: "featured" });

  return (
    <div className="mkt-wrapper">
      <div className="mkt-hero">
        <h1 className="mkt-title">Free Notion Templates</h1>
        <p className="mkt-subtitle">
          Browse, preview, and duplicate templates directly into your Notion workspace.
        </p>
      </div>

      <ControlBar filters={filters} onChange={setFilters} />

      {showFeatured && (
        <div className="mkt-featured">
          <h2 className="mkt-section-label">✨ Featured Templates</h2>
          <div className="mkt-featured-grid">
            {featuredItems.map((tpl) => (
              <FeaturedCard key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>
      )}

      <div className="mkt-section">
        <h2 className="mkt-section-label">
          {filtered.length} Template{filtered.length !== 1 ? "s" : ""}
        </h2>
        <div className="mkt-grid">
          {filtered.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} />
          ))}
        </div>
        {filtered.length === 0 && <EmptyState onReset={resetFilters} />}
      </div>
    </div>
  );
}