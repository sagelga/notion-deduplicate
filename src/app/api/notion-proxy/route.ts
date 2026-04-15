// notion-proxy/route.ts
//
// Thin server-side proxy for all Notion API calls.
//
// Why this exists:
//   Notion's API does not support CORS for integration tokens (secret_...).
//   Browser requests are rejected at the OPTIONS preflight with 400.
//   This route forwards requests from the client to Notion, adding the
//   Authorization header from the token the client sends.
//
// Security note:
//   The token travels in the HTTPS-encrypted request body, not as a header.
//   It is never logged or stored; it is used only for the forwarded request.
//   Path validation restricts forwarding to Notion API paths only (/v1/...).
//
// Retry-After header forwarding:
//   When Notion returns a 429, the Retry-After header is forwarded so the
//   client-side fetchWithRetry can respect Notion's throttle window exactly.

export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { path, method, token, body } = await req.json();

  // Validate required fields and restrict to Notion API paths.
  if (
    !token ||
    typeof token !== "string" ||
    !path ||
    typeof path !== "string" ||
    !path.startsWith("/v1/")
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const hasBody = body !== undefined && body !== null;

  const notionRes = await fetch(`https://api.notion.com${path}`, {
    method: method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const data = await notionRes.json();

  // Forward Retry-After so the client can honour Notion's throttle window.
  const responseHeaders: HeadersInit = {};
  const retryAfter = notionRes.headers.get("Retry-After");
  if (retryAfter) responseHeaders["Retry-After"] = retryAfter;

  return NextResponse.json(data, {
    status: notionRes.status,
    headers: responseHeaders,
  });
}
