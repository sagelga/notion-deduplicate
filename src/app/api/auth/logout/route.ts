// /api/auth/logout
//
// Clears all auth-related cookies and redirects the user back to the home page.
// Supports both the token-paste flow (notion_token) and the OAuth flow
// (notion_client_id, notion_client_secret).
//
// Cookies are expired by setting maxAge: 0 rather than calling delete(), which
// works reliably across browsers on the edge runtime.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export async function POST() {
  const cookieStore = await cookies();
  const expired = { maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

  cookieStore.set("notion_token", "", expired);
  cookieStore.set("notion_client_id", "", expired);
  cookieStore.set("notion_client_secret", "", expired);

  redirect("/");
}
