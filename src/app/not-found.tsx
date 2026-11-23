import type { Metadata } from "next";

import { auth } from "@/auth";
import NotFoundContent from "@/components/content/errors/notFoundContent";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const session = await auth();
  return <NotFoundContent isSignedIn={Boolean(session?.user)} />;
}
