// SubmitTemplateModal.tsx
//
// Simple overlay modal for template submission.
// Users fill in their template details and copy a formatted message
// to send to the marketplace admin.

"use client";

import React, { useState } from "react";
import "./SubmitTemplateModal.css";

interface SubmitTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ["Productivity", "Knowledge", "Work", "Personal", "Other"];

export default function SubmitTemplateModal({
  isOpen,
  onClose,
}: SubmitTemplateModalProps) {
  const [form, setForm] = useState({
    name: "",
    author: "",
    category: "Productivity",
    notionUrl: "",
    description: "",
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const message = `New Template Submission!
Name: ${form.name}
Author: ${form.author}
Category: ${form.category}
Notion Template URL: ${form.notionUrl}
Description: ${form.description}`.trim();

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isValid =
    form.name.trim() &&
    form.author.trim() &&
    form.notionUrl.trim() &&
    form.description.trim();

  return (
    <div className="stm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stm-modal" role="dialog" aria-modal="true" aria-labelledby="stm-title">
        <div className="stm-header">
          <h2 id="stm-title" className="stm-title">Submit Your Template</h2>
          <button className="stm-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="stm-body">
          <p className="stm-intro">
            Fill in the details below and copy the message to send to the marketplace admin.
            Your template will be reviewed and added to the marketplace.
          </p>

          <div className="stm-fields">
            <div className="stm-field">
              <label className="stm-label" htmlFor="stm-name">Template Name *</label>
              <input
                id="stm-name"
                name="name"
                type="text"
                className="stm-input"
                placeholder="e.g. Weekly Planner"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="stm-field">
              <label className="stm-label" htmlFor="stm-author">Your Name *</label>
              <input
                id="stm-author"
                name="author"
                type="text"
                className="stm-input"
                placeholder="e.g. Jane Smith"
                value={form.author}
                onChange={handleChange}
              />
            </div>

            <div className="stm-field">
              <label className="stm-label" htmlFor="stm-category">Category</label>
              <select
                id="stm-category"
                name="category"
                className="stm-select"
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="stm-field">
              <label className="stm-label" htmlFor="stm-url">Notion Template URL *</label>
              <input
                id="stm-url"
                name="notionUrl"
                type="url"
                className="stm-input"
                placeholder="https://www.notion.so/..."
                value={form.notionUrl}
                onChange={handleChange}
              />
            </div>

            <div className="stm-field stm-field--full">
              <label className="stm-label" htmlFor="stm-desc">Short Description *</label>
              <textarea
                id="stm-desc"
                name="description"
                className="stm-textarea"
                placeholder="Describe what this template does in 1-2 sentences..."
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="stm-footer">
          <button className="stm-btn stm-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="stm-btn stm-btn--primary"
            onClick={handleCopy}
            disabled={!isValid}
          >
            {copied ? "Copied!" : "Copy Submission Message"}
          </button>
        </div>
      </div>
    </div>
  );
}