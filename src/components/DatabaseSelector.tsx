"use client";

import { useState } from "react";
import { getDatabaseSchema, NotionProperty } from "@/lib/notion";
import DeduplicateView from "./DeduplicateView";

interface Database {
  id: string;
  title: Array<{ plain_text: string }>;
}

interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

const DEDUPLICATABLE_TYPES = new Set([
  "title",
  "rich_text",
  "select",
  "number",
  "email",
  "url",
  "phone_number",
  "checkbox",
  "date",
]);

export default function DatabaseSelector({
  databases,
  notionToken,
}: {
  databases: Database[];
  notionToken: string;
}) {
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleDatabaseSelect = async (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setSelectedProperty("");
    setPages([]);
    setError("");

    try {
      setLoading(true);
      const schema = await getDatabaseSchema(databaseId, notionToken);
      const deduplicatable = schema.filter((p) =>
        DEDUPLICATABLE_TYPES.has(p.type)
      );
      setProperties(deduplicatable);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load database schema"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = async (propertyName: string) => {
    setSelectedProperty(propertyName);
    setError("");

    try {
      setLoading(true);
      const response = await fetch(
        `/api/databases/${selectedDatabaseId}/pages`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }

      const data = await response.json();
      setPages(data.pages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pages"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-800 rounded-lg p-4 text-red-100">
          {error}
        </div>
      )}

      {/* Database Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Select Database
        </label>
        <select
          value={selectedDatabaseId}
          onChange={(e) => handleDatabaseSelect(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Choose a database...</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.title[0]?.plain_text || "(Untitled)"}
            </option>
          ))}
        </select>
      </div>

      {/* Property Selector */}
      {selectedDatabaseId && properties.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Deduplicate By
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => handlePropertySelect(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Choose a field...</option>
            {properties.map((prop) => (
              <option key={prop.name} value={prop.name}>
                {prop.name} ({prop.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border border-indigo-500 border-t-transparent"></div>
          </div>
          <p className="text-gray-400 mt-3">Loading...</p>
        </div>
      )}

      {/* Deduplicate View */}
      {selectedProperty && pages.length > 0 && !loading && (
        <DeduplicateView pages={pages} fieldName={selectedProperty} />
      )}

      {selectedProperty && pages.length === 0 && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No pages found in this database</p>
        </div>
      )}
    </div>
  );
}
