import { redirect } from "next/navigation";

export const runtime = 'edge';

export async function GET() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "NOTION_CLIENT_ID and NOTION_REDIRECT_URI environment variables must be set"
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user",
  });

  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  redirect(authUrl);
}
