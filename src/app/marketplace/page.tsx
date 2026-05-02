// page.tsx — Marketplace page (/marketplace)
//
// Client component that renders a browsable gallery of free Notion templates.
// Template data is fetched from the marketplace Notion database.
//
// UI features:
//   - Full-text search across template name and description
//   - Category and tag filtering
//   - Sort by featured, trending, alphabetical, category, or most installed
//   - Featured section shown only when no filters are active (default view)
//   - Install count display
//   - Author attribution
//   - Duplicate flow: opens Notion template and shows tooltip instruction
//   - Submit template modal

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import SubmitTemplateModal from "@/components/marketplace/SubmitTemplateModal";
import "./page.css";

export const runtime = "edge";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  emoji: string;
  gradient: string;
  featured: boolean;
  trending: boolean;
  href: string;
  author: string | null;
  installCount: number;
  tags: string[];
}

type SortValue = "featured" | "trending" | "alphabetical" | "category" | "installed";

interface Filters {
  search: string;
  category: string;
  tags: string[];
  sort: SortValue;
}

const CATEGORIES = ["All", "Productivity", "Knowledge", "Work", "Personal", "Other"];

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Trending", value: "trending" },
  { label: "A-Z", value: "alphabetical" },
  { label: "Category", value: "category" },
  { label: "Most Installed", value: "installed" },
];

function SkeletonCard() {
  return (
    <div className="mkt-card mkt-card--skeleton">
      <div className="mkt-card-preview-skeleton" />
      <div className="mkt-card-body">
        <div className="mkt-skeleton-line mkt-skeleton-line--short" />
        <div className="mkt-skeleton-line" />
        <div className="mkt-skeleton-line mkt-skeleton-line--long" />
      </div>
    </div>
  );
}

function CardPreview({ template, size }: { template: Template; size: "featured" | "card" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(template.href, "_blank", "noopener,noreferrer");
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3500);

    if (template.id) {
      fetch(`/api/marketplace/templates/${template.id}/install`, { method: "POST" }).catch(() => {});
    }
  };

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

      {size === "card" && (
        <div className="mkt-duplicate-wrapper">
          <button
            className="mkt-card-btn"
            onClick={handleDuplicate}
            aria-label={`Duplicate ${template.name} to Notion`}
          >
            Duplicate to Notion →
          </button>
          {showTooltip && (
            <div className="mkt-tooltip">
              In Notion, click <strong>•••</strong> → <strong>Duplicate</strong> to add to your workspace
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="mkt-card">
      <CardPreview template={template} size="card" />
      <div className="mkt-card-body">
        <span className="mkt-card-category">{template.category}</span>
        <h2 className="mkt-card-name">{template.name}</h2>
        <p className="mkt-card-desc">{template.description}</p>

        {template.tags.length > 0 && (
          <div className="mkt-card-tags">
            {template.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="mkt-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="mkt-card-meta">
          {template.author && (
            <span className="mkt-card-author">by {template.author}</span>
          )}
          <span className="mkt-card-installs">
            {template.installCount > 0 ? `${template.installCount.toLocaleString()} installs` : " "}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ template }: { template: Template }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(template.href, "_blank", "noopener,noreferrer");
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3500);

    if (template.id) {
      fetch(`/api/marketplace/templates/${template.id}/install`, { method: "POST" }).catch(() => {});
    }
  };

  return (
    <div className="mkt-featured-card">
      <div className="mkt-featured-preview" style={{ background: template.gradient }}>
        <span className="mkt-featured-emoji">{template.emoji}</span>
      </div>
      <div className="mkt-featured-info">
        <div className="mkt-featured-top">
          <span className="mkt-badge">Featured</span>
          {template.trending && <span className="mkt-badge mkt-badge--trending">🔥 Trending</span>}
        </div>
        <h3 className="mkt-featured-name">{template.name}</h3>
        <p className="mkt-featured-desc">{template.description}</p>
        <div className="mkt-featured-meta">
          {template.author && <span className="mkt-featured-author">by {template.author}</span>}
          <span className="mkt-featured-installs">
            {template.installCount > 0 ? `${template.installCount.toLocaleString()} installs` : ""}
          </span>
        </div>

        <div className="mkt-featured-actions">
          <button className="mkt-featured-duplicate" onClick={handleDuplicate}>
            Duplicate to Notion →
          </button>
          {showTooltip && (
            <div className="mkt-tooltip mkt-tooltip--featured">
              In Notion, click <strong>•••</strong> → <strong>Duplicate</strong> to add to your workspace
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagFilter({
  availableTags,
  selectedTags,
  onChange,
}: {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="mkt-tag-filter">
      <span className="mkt-filter-label">Tags</span>
      <div className="mkt-tag-list">
        {availableTags.map((tag) => (
          <button
            key={tag}
            className={`mkt-tag-chip ${selectedTags.includes(tag) ? "mkt-tag-chip--active" : ""}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlBar({
  filters,
  onChange,
  availableTags,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  availableTags: string[];
}) {
  const [showSubmit, setShowSubmit] = useState(false);

  return (
    <>
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
        <button className="mkt-submit-btn" onClick={() => setShowSubmit(true)}>
          Submit Template
        </button>
      </div>

      {availableTags.length > 0 && (
        <TagFilter
          availableTags={availableTags}
          selectedTags={filters.tags}
          onChange={(tags) => onChange({ ...filters, tags })}
        />
      )}

      <SubmitTemplateModal isOpen={showSubmit} onClose={() => setShowSubmit(false)} />
    </>
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mkt-empty">
      <p className="mkt-empty-text">{message}</p>
      <button className="mkt-empty-reset" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "All",
    tags: [],
    sort: "featured",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/templates");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load templates (${res.status})`);
      }
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [templates]);

  const featuredItems = useMemo(
    () => templates.filter((t) => t.featured),
    [templates]
  );

  const filtered = useMemo(() => {
    let result = [...templates];

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

    if (filters.tags.length > 0) {
      result = result.filter((t) => filters.tags.some((tag) => t.tags.includes(tag)));
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
      case "installed":
        result.sort((a, b) => b.installCount - a.installCount);
        break;
    }

    return result;
  }, [templates, filters]);

  const showFeatured = !filters.search && filters.category === "All" && filters.tags.length === 0 && filters.sort === "featured";

  const resetFilters = () =>
    setFilters({ search: "", category: "All", tags: [], sort: "featured" });

  return (
    <div className="mkt-wrapper">
      <div className="mkt-hero">
        <h1 className="mkt-title">Free Notion Templates</h1>
        <p className="mkt-subtitle">
          Browse, preview, and duplicate templates directly into your Notion workspace.
        </p>
      </div>

      <ControlBar
        filters={filters}
        onChange={setFilters}
        availableTags={allTags}
      />

      {error && <ErrorState message={error} onRetry={fetchTemplates} />}

      {loading && !error && (
        <div className="mkt-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && !error && showFeatured && featuredItems.length > 0 && (
        <div className="mkt-featured">
          <h2 className="mkt-section-label">✨ Featured Templates</h2>
          <div className="mkt-featured-grid">
            {featuredItems.map((tpl) => (
              <FeaturedCard key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>
      )}

      {!loading && !error && (
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
      )}
    </div>
  );
}