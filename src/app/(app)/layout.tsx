import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layouts/appShell/appShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // Middleware only guards /dashboard until milestone 3; this stops the shell rendering for nobody.
  if (!session?.user) redirect("/login");

  const { name, email, image } = session.user;
  const user = { name: name || email || "Account", email: email ?? "", imageUrl: image };

  return <AppShell user={user}>{children}</AppShell>;
}
