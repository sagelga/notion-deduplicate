"use client";

import { useState } from "react";

interface Page {
  id: string;
  created_time: string;
  title: string;
  properties: Record<string, string | null>;
}

interface DuplicateGroup {
  value: string;
  pages: Page[];
}

export default function DeduplicateView({
  pages,
  fieldName,
}: {
  pages: Page[];
  fieldName: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{
    deleted: number;
    errors: number;
  } | null>(null);

  // Group pages by field value
  const groups = new Map<string, Page[]>();

  for (const page of pages) {
    const value = page.properties[fieldName] ?? "(empty)";
    if (!groups.has(value)) {
      groups.set(value, []);
    }
    groups.get(value)!.push(page);
  }

  // Filter to only duplicates
  const duplicateGroups: DuplicateGroup[] = Array.from(groups.entries())
    .filter(([, groupPages]) => groupPages.length > 1)
    .map(([value, groupPages]) => {
      // Sort by created_time descending (newest first)
      const sorted = [...groupPages].sort(
        (a, b) =>
          new Date(b.created_time).getTime() -
          new Date(a.created_time).getTime()
      );
      return { value, pages: sorted };
    })
    .sort((a, b) => b.pages.length - a.pages.length);

  const pagesToDelete = duplicateGroups.reduce(
    (count, group) => count + (group.pages.length - 1),
    0
  );

  const handleDeleteDuplicates = async () => {
    const pageIdsToDelete: string[] = [];

    for (const group of duplicateGroups) {
      // Keep the first (newest) page, delete the rest
      for (let i = 1; i < group.pages.length; i++) {
        pageIdsToDelete.push(group.pages[i].id);
      }
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: pageIdsToDelete }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete duplicates");
      }

      const data = await response.json();
      setResult({ deleted: data.deleted, errors: data.errors });
    } catch (error) {
      console.error("Delete error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete duplicates"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Deletion Complete</h3>
        <div className="space-y-2 text-gray-300 mb-6">
          <p>
            <span className="font-semibold text-green-400">
              {result.deleted}
            </span>{" "}
            pages deleted
          </p>
          {result.errors > 0 && (
            <p>
              <span className="font-semibold text-red-400">{result.errors}</span>{" "}
              errors
            </p>
          )}
        </div>
        <a
          href="/dashboard"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="space-y-2">
          <p className="text-gray-400">
            <span className="font-bold text-white text-lg">
              {duplicateGroups.length}
            </span>{" "}
            duplicate groups found
          </p>
          <p className="text-gray-400">
            <span className="font-bold text-white text-lg">
              {pagesToDelete}
            </span>{" "}
            pages will be deleted
          </p>
        </div>
      </div>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {duplicateGroups.map((group) => (
          <div
            key={group.value}
            className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
          >
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
              <p className="text-gray-300 font-mono text-sm">
                {group.value || "(empty value)"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {group.pages.length} pages
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950">
                    <th className="px-6 py-3 text-left text-gray-400 font-medium">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-gray-400 font-medium">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-gray-400 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.pages.map((page, index) => (
                    <tr
                      key={page.id}
                      className={
                        index === 0
                          ? "bg-gray-900 border-b border-gray-800"
                          : "bg-gray-950 border-b border-gray-800"
                      }
                    >
                      <td className="px-6 py-4 text-gray-300">
                        {page.title}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                        {new Date(page.created_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {index === 0 ? (
                          <span className="inline-block bg-green-900 text-green-300 px-3 py-1 rounded text-xs font-semibold">
                            KEEP
                          </span>
                        ) : (
                          <span className="inline-block bg-red-900 text-red-300 px-3 py-1 rounded text-xs font-semibold">
                            DELETE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDeleteDuplicates}
          disabled={deleting || pagesToDelete === 0}
          className={`font-semibold py-3 px-6 rounded-lg transition duration-200 ${
            deleting || pagesToDelete === 0
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {deleting ? "Deleting..." : `Delete ${pagesToDelete} duplicates`}
        </button>
      </div>
    </div>
  );
}
