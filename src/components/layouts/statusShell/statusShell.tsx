import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo/logo";

/** A full page with just the logo and a short message: not found, and errors outside the app shell. */
export function StatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-page px-6 py-8 text-fg-primary">
      <Link href="/" className="self-start rounded-sm">
        <Logo />
      </Link>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">{children}</main>
    </div>
  );
}
