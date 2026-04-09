import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SetupForm from "@/components/SetupForm";
import "./page.css";

export const runtime = 'edge';

export default async function Home() {
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token");

  if (notionToken) {
    redirect("/dashboard");
  }

  return (
    <div className="home-wrapper">
      <div className="home-card">
        <h1 className="home-title">Notion Deduplicate</h1>
        <p className="home-subtitle">Find and delete duplicate Notion pages</p>
        <SetupForm />
      </div>
    </div>
  );
}
