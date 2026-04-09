import { cookies } from "next/headers";
import { getDatabaseSchema } from "@/lib/notion";

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: databaseId } = await params;
  const cookieStore = await cookies();
  const notionToken = cookieStore.get("notion_token")?.value;

  if (!notionToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await getDatabaseSchema(databaseId, notionToken);
    return Response.json({ schema });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch schema" },
      { status: 500 }
    );
  }
}
