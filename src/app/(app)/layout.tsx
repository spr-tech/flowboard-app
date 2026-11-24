import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PATH_HEADER } from "@/auth.config";
import { AppShell } from "@/components/layouts/appShell/appShell";
import { verificationRedirect } from "@/server/auth/verificationGate";

// Signed-in pages are private: keep them out of search results even if a crawler finds a link.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Middleware has already sent signed-out visitors to /login. A null here means the token looked
  // valid to middleware but not to the server (password changed since, or the user is gone).
  const session = await auth();
  if (!session?.user) redirect("/auth/session-ended");

  // The verification gate: unconfirmed emails go to the code page, then back to this page.
  const gate = verificationRedirect(session.user, (await headers()).get(PATH_HEADER));
  if (gate) redirect(gate);

  const { name, email, image } = session.user;
  const user = { name: name || email || "Account", email, imageUrl: image };

  return <AppShell user={user}>{children}</AppShell>;
}
