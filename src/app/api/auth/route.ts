// /api/auth
//
// Initiates the Notion OAuth flow. This is the secondary auth path —
// the primary path is pasting a token directly via /api/setup.
//
// Flow: GET /api/auth → redirects the browser to Notion's OAuth consent screen.
// After the user approves, Notion redirects back to /api/auth/callback with a
// one-time authorization code.
//
// Client credentials (client_id) are read from cookies first so that users who
// arrived via a custom OAuth app can override the server-level env var. This
// allows multi-tenant usage without redeploying.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export async function GET(request: Request) {
  const cookieStore = await cookies();

  const clientId =
    cookieStore.get("notion_client_id")?.value ?? process.env.NOTION_CLIENT_ID;

  if (!clientId) {
    redirect("/?error=missing_credentials");
  }

  const origin = new URL(request.url).origin;
  const redirectUri =
    process.env.NOTION_REDIRECT_URI ?? `${origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    owner: "user",
  });

  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  redirect(authUrl);
}
