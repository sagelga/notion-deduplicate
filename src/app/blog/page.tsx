// page.tsx — Blog page (/blog)
//
// This route exists purely to redirect visitors to the canonical blog hosted
// on sagelga.com. There is no local blog content. The redirect is permanent
// in user-experience terms; Next.js redirect() issues a 307 by default on
// the edge runtime.

import { redirect } from "next/navigation";

export const runtime = 'edge';

export default function BlogPage() {
  redirect("https://sagelga.com/blog");
}
