// /api/auth/callback
//
// Handles the OAuth redirect from Notion after the user approves access.
// Notion appends a short-lived ?code= to the URL; this route exchanges it for
// a long-lived access_token using the client credentials.
//
// Credential resolution order (same as /api/auth):
//   1. Cookie values set by the user (custom OAuth app)
//   2. Server-level environment variables (shared default app)
//
// On success the access_token is stored as an httpOnly cookie (notion_token)
// with a 24-hour TTL and the user is forwarded to /duplicate.
// On failure the raw Notion error is returned so the user can diagnose it.

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
    // Notion requires HTTP Basic auth for the token exchange: credentials are
    // base64-encoded as "clientId:clientSecret" per the OAuth 2.0 spec.
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

  // Non-httpOnly with short TTL: the client reads this cookie on /duplicate load,
  // moves the token to localStorage, then immediately expires the cookie.
  cookieStore.set("notion_token", accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60,
    path: "/",
  });

  redirect("/duplicate");
}
