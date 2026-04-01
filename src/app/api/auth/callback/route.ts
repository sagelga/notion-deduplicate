import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("No authorization code provided", { status: 400 });
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, and NOTION_REDIRECT_URI environment variables must be set"
    );
  }

  try {
    // Exchange code for access token
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
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
      return new Response("Failed to authenticate with Notion", {
        status: 400,
      });
    }

    const data = await response.json();
    const accessToken = data.access_token;

    if (!accessToken) {
      return new Response("No access token in response", { status: 400 });
    }

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("notion_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    redirect("/dashboard");
  } catch (error) {
    console.error("Auth callback error:", error);
    return new Response("Authentication failed", { status: 500 });
  }
}
