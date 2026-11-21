"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pin } from "lucide-react";

import { useProjects } from "@/services/projectsService";
import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import { cn } from "@/utilities/helpers/cn";
import { selectSidebarProjects } from "@/utilities/helpers/projectOrder";

type SidebarProjectsProps = {
  /** The phone drawer passes this so it closes once a project is chosen. */
  onNavigate?: () => void;
};

/**
 * "Your projects": at most 3, pinned first, then the ones I opened most recently
 * (docs/designs/sidebar-and-pinning.md). It shares the projects page's cached list.
 * Nothing shows while loading, after an error, or when I have no projects.
 */
export function SidebarProjects({ onNavigate }: SidebarProjectsProps) {
  const pathname = usePathname();
  const { data: projects } = useProjects();
  const shown = selectSidebarProjects(projects ?? []);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="sidebar-projects-heading">
      <h2
        id="sidebar-projects-heading"
        className="mb-2.5 px-3.5 text-xs font-semibold tracking-wider text-fg-muted-on-inverse uppercase"
      >
        Your projects
      </h2>
      <ul className="flex flex-col gap-0.5">
        {shown.map((project) => {
          const href = `/projects/${project.id}`;
          const isCurrent = pathname === href;
          return (
            <li key={project.id}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-sm text-fg-on-inverse transition-colors hover:bg-surface-inverse-raised",
                  isCurrent && "bg-surface-inverse-raised"
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-[3px]", PROJECT_COLOUR_STYLES[project.colour].fill)}
                />
                <span className="min-w-0 truncate">{project.name}</span>
                {project.me.pinnedAt && (
                  <Pin role="img" aria-label="Pinned" className="ml-auto size-3 shrink-0 fill-current text-highlight" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
