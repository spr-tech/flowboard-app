import Link from "next/link";

import { Logo } from "@/components/ui/logo/logo";
import { Reveal } from "@/components/ui/reveal/reveal";

const linkGroups = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Features", href: "/#features" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/register" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
    ],
  },
];

export function LandingFooter() {
  return (
    <Reveal as="footer" effect="fade" className="bg-surface-inverse px-6 pt-16 pb-10 text-fg-muted-on-inverse">
      <div className="mx-auto flex max-w-300 flex-wrap justify-between gap-10">
        <div className="max-w-80">
          <Logo variant="onDark" className="mb-3.5" />
          <p className="text-[15px] leading-relaxed">
            A Kanban workspace for small teams. Designed and built by Muizz Jamiu.
          </p>
        </div>
        <div className="flex flex-wrap gap-16 text-[15px]">
          {linkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
              <span className="font-semibold text-fg-on-inverse">{group.title}</span>
              {group.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  // The underline is a 1px background that grows from the left, 0% to 100% wide.
                  className="rounded-sm bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat transition-[color,background-size] duration-300 ease-out hover:bg-[length:100%_1px] hover:text-fg-on-inverse focus-visible:bg-[length:100%_1px] focus-visible:text-fg-on-inverse"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-300 border-t border-fg-on-inverse/10 pt-6 text-sm">© 2026 Flowboard</p>
    </Reveal>
  );
}
