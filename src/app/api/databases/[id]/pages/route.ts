import { cookies } from "next/headers";
import { getDatabaseSchema, notionHeaders, getPropertyValue, paginateDatabase } from "@/lib/notion";

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: databaseId } = await params;
    const cookieStore = await cookies();
    const notionToken = cookieStore.get("notion_token")?.value;

    if (!notionToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get database schema to map property types
    const schema = await getDatabaseSchema(databaseId, notionToken);
    const propertyTypeMap = new Map(schema.map((p) => [p.name, p.type]));

    // Paginate through all pages
    const pages: any[] = [];
    for await (const batch of paginateDatabase(databaseId, notionToken)) {
      for (const page of batch) {
        // Extract title from the page
        let title = "";
        const titleProperty = Object.entries(page.properties || {}).find(
          ([, prop]: [string, any]) => prop.type === "title"
        );

        if (titleProperty) {
          const titleValue = titleProperty[1] as any;
          title = titleValue.title?.[0]?.plain_text ?? "(Untitled)";
        }

        // Extract property values with type information
        const properties: Record<string, string | null> = {};
        for (const [propName, propValue] of Object.entries(
          page.properties || {}
        )) {
          const propType = propertyTypeMap.get(propName) || "unknown";
          const value = getPropertyValue(propValue, propType);
          properties[propName] = value;
        }

        pages.push({
          id: page.id,
          created_time: page.created_time,
          title,
          properties,
        });
      }
    }

    return new Response(JSON.stringify({ pages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch pages",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
