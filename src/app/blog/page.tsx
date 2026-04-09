import { redirect } from "next/navigation";

export const runtime = 'edge';

export default function BlogPage() {
  redirect("https://sagelga.com/blog");
}
