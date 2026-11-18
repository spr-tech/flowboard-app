import Link from "next/link";

import { Logo } from "@/components/ui/logo/logo";
import { GITHUB_REPO_URL, LIVE_APP_URL } from "@/utilities/constants/links";

const linkGroups = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Features", href: "#features" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: GITHUB_REPO_URL },
      { label: "Live app", href: LIVE_APP_URL },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-surface-inverse px-6 pt-16 pb-10 text-fg-muted-on-inverse">
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
                  className="rounded-sm transition-colors hover:text-fg-on-inverse"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-300 border-t border-fg-on-inverse/10 pt-6 text-sm">
        © 2026 Flowboard
      </p>
    </footer>
  );
}
