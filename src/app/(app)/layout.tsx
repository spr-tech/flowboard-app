import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layouts/appShell/appShell";

// Signed-in pages are private: keep them out of search results even if a crawler finds a link.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Middleware has already sent signed-out visitors to /login. A null here means the token looked
  // valid to middleware but not to the server (password changed since, or the user is gone).
  const session = await auth();
  if (!session?.user) redirect("/auth/session-ended");

  const { name, email, image } = session.user;
  const user = { name: name || email || "Account", email, imageUrl: image };

  return <AppShell user={user}>{children}</AppShell>;
}
