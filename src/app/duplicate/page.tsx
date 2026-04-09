import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listDatabases, type NotionDatabase } from "@/lib/notion";
import DatabaseSelector from "@/components/DatabaseSelector";
import "./page.css";

export const runtime = 'edge';

async function getDatabases(token: string): Promise<NotionDatabase[]> {
  return listDatabases(token);
}

export default async function DuplicatePage() {
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token")?.value;

  if (!notionToken) {
    redirect("/");
  }

  let databases: NotionDatabase[] = [];
  let loadError: string | null = null;

  try {
    databases = await getDatabases(notionToken!);
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }

  if (loadError) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-error-card">
          <h2 className="dashboard-error-title">Error</h2>
          <p className="dashboard-error-desc">{loadError}</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="dashboard-logout-btn">
              Logout &amp; try a different token
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Duplicate</h1>
          <p className="dashboard-subtitle">Select a database and a field to find and remove duplicates</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="dashboard-logout-btn">Logout</button>
        </form>
      </div>
      <DatabaseSelector databases={databases} />
    </div>
  );
}
