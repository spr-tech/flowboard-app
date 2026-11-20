import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Logo } from "@/components/ui/logo/logo";
import { cn } from "@/utilities/helpers/cn";

// Each link lights up in a different brand colour and tips like a sticker on hover.
const sectionLinks = [
  { label: "How it works", href: "#how", hover: "hover:bg-highlight hover:text-fg-on-highlight" },
  { label: "Features", href: "#features", hover: "hover:bg-primary hover:text-fg-on-primary" },
  { label: "Why Flowboard", href: "#why", hover: "hover:bg-surface-inverse hover:text-highlight" },
  { label: "FAQ", href: "#faq", hover: "hover:bg-surface-sunken hover:text-fg-primary" },
];

export function LandingNav() {
  return (
    <header className="px-6 pt-5">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-300 flex-wrap items-center justify-between gap-4 rounded-full border border-line-subtle bg-surface-card py-2.5 pr-2.5 pl-5.5"
      >
        <Link href="#top" className="rounded-lg">
          <Logo variant="onLight" />
        </Link>
        <div className="hidden gap-7 text-[15px] md:flex">
          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("rounded-full px-3.5 py-2 text-fg-secondary transition hover:-rotate-3", link.hover)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/login" text="Sign in" variant="ghost" />
          <ButtonLink href="/register" text="Get started" />
        </div>
      </nav>
    </header>
  );
}
