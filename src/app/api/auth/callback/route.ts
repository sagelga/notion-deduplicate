import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("No authorization code provided", { status: 400 });
  }

  const cookieStore = await cookies();

  const clientId =
    cookieStore.get("notion_client_id")?.value ?? process.env.NOTION_CLIENT_ID;
  const clientSecret =
    cookieStore.get("notion_client_secret")?.value ?? process.env.NOTION_CLIENT_SECRET;
  const redirectUri =
    process.env.NOTION_REDIRECT_URI ?? `${url.origin}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    redirect("/?error=missing_credentials");
  }

  let accessToken: string;

  try {
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Notion OAuth error:", error);
      return new Response(`Failed to authenticate with Notion: ${error}`, {
        status: 400,
      });
    }

    const data = await response.json();
    accessToken = data.access_token;

    if (!accessToken) {
      return new Response("No access token in response", { status: 400 });
    }
  } catch (error) {
    console.error("Auth callback error:", error);
    return new Response("Authentication failed", { status: 500 });
  }

  cookieStore.set("notion_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });

  redirect("/dashboard");
}
