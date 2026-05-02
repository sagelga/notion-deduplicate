// page.tsx — Blog page (/blog)
//
// This route exists purely to redirect visitors to the canonical blog hosted
// on sagelga.com. There is no local blog content. The redirect is a permanent
// (308) redirect so search engines pass link equity to the destination.

import { permanentRedirect } from "next/navigation";

export const runtime = 'edge';

export default function BlogPage() {
  permanentRedirect("https://sagelga.com/blog");
}
