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
