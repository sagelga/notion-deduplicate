import { cookies } from "next/headers";

export const runtime = 'edge';

export async function POST(request: Request) {
  let body: { token?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body;

  if (!token) {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  // Strip whitespace and any non-ASCII characters that would break HTTP headers
  const cleanToken = token.trim().replace(/[^\x20-\x7E]/g, "");

  if (!cleanToken) {
    return Response.json({ error: "token is empty after cleaning — check for invalid characters" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("notion_token", cleanToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  });

  return Response.json({ ok: true });
}
