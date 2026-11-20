import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo/logo";
import { cn } from "@/utilities/helpers/cn";

const tones = {
  inverse: { panel: "bg-surface-inverse text-fg-on-inverse", logo: "onDark" },
  primary: { panel: "bg-primary text-fg-on-primary", logo: "onPrimary" },
} as const;

type AuthShellProps = {
  /** The decorative left half. Hidden on phones, where the form needs the room. */
  panel: ReactNode;
  tone: keyof typeof tones;
  /** The form column. */
  children: ReactNode;
  /** Extra classes for the outer wrapper. */
  className?: string;
};

/**
 * Split screen for sign in and sign up: a coloured story panel on the left, the form on the right.
 * From md up, the panel is sticky: it stays pinned to the screen while a long form scrolls.
 */
export function AuthShell({ panel, tone, children, className }: AuthShellProps) {
  const colours = tones[tone];

  return (
    <div className={cn("flex min-h-dvh flex-wrap bg-surface-page md:flex-nowrap", className)}>
      <aside
        className={cn(
          "relative hidden flex-[1_1_520px] flex-col justify-between gap-12 overflow-hidden rounded-r-[40px] px-12 py-10",
          // Sticky needs a fixed height and no stretching, or it has nowhere to stick.
          "md:sticky md:top-0 md:flex md:h-dvh md:self-start",
          colours.panel,
        )}
      >
        <Link href="/" className="self-start rounded-lg">
          <Logo variant={colours.logo} />
        </Link>
        {panel}
      </aside>

      <main className="flex flex-[1_1_480px] items-center justify-center px-6 py-12">
        <div className="w-full max-w-105">
          {/* Phones lose the panel, so the logo moves above the form. */}
          <Link href="/" className="mb-10 inline-block rounded-lg md:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}