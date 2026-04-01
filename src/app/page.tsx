import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export default async function Home() {
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token");

  if (notionToken) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Notion Deduplicate
          </h1>
          <p className="text-gray-400 mb-8">
            Find and delete duplicate Notion pages
          </p>

          <a
            href="/api/auth"
            className="inline-block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Connect with Notion
          </a>

          <p className="text-gray-500 text-sm mt-6">
            This app requires access to your Notion workspace to scan and
            deduplicate pages. Your credentials are stored securely.
          </p>
        </div>
      </div>
    </div>
  );
}
