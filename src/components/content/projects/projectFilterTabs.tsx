import Link from "next/link";

import { cn } from "@/utilities/helpers/cn";
import type { ProjectFilter } from "@/utilities/helpers/projectOrder";

const tabs: { filter: ProjectFilter; label: string }[] = [
  { filter: "all", label: "All" },
  { filter: "owned", label: "Owned by me" },
  { filter: "shared", label: "Shared with me" },
];

/** All / Owned by me / Shared with me. Links, because the filter lives in the URL (?filter=). */
export function ProjectFilterTabs({ active }: { active: ProjectFilter }) {
  return (
    <nav aria-label="Filter projects" className="inline-flex gap-1 rounded-full bg-surface-sunken p-1">
      {tabs.map(({ filter, label }) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter}
            href={filter === "all" ? "/projects" : `/projects?filter=${filter}`}
            replace
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
              isActive ? "bg-surface-inverse text-fg-on-inverse" : "text-fg-secondary hover:text-fg-primary"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
