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
