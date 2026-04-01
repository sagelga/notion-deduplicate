import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listDatabases } from "@/lib/notion";
import DatabaseSelector from "@/components/DatabaseSelector";

export const runtime = 'edge';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token")?.value;

  if (!notionToken) {
    redirect("/");
  }

  try {
    const databases = await listDatabases(notionToken);

    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Notion Deduplicate
            </h1>
            <p className="text-gray-400">
              Select a database and a field to find and remove duplicates
            </p>
          </div>

          <DatabaseSelector
            databases={databases}
            notionToken={notionToken}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">
            Failed to load databases. Please try again.
          </p>
          <a
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }
}
