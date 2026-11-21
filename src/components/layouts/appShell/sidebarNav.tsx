"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/utilities/helpers/cn";

type NavItem = { label: string; href: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** "/projects/abc/settings" still highlights Projects, not Settings: only the first segment counts. */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarNavProps = {
  /** The phone drawer passes this so it closes once a link is chosen. */
  onNavigate?: () => void;
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isCurrent = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors",
              isCurrent
                ? "bg-highlight text-fg-on-highlight"
                : "text-fg-muted-on-inverse hover:bg-surface-inverse-raised hover:text-fg-on-inverse"
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
