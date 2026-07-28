"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, Users, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Team", href: "/teams", icon: Users },
  { label: "Workspace", href: "/workspace", icon: Settings },
];

type SidebarProps = {
  sidebarOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
};

export default function Sidebar({
  sidebarOpen,
  isMobile,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`
         bg-[#1E1B2E]
        border-r
        border-slate-900
        overflow-hidden
        flex
        flex-col
        z-40
        transition-all
        duration-300
        ease-in-out
        ${
          isMobile
            ? `fixed top-12 bottom-0 left-0 w-60  ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `fixed top-11 bottom-0 left-0 ${sidebarOpen ? "w-60" : "w-14"}`
        }
      `}
    >
      {/* Navigation */}
      <nav
        className={`flex-1 py-6 flex flex-col gap-1.5 ${
          sidebarOpen ? "px-3" : "px-2"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${
                isActive
                  ? "bg-purple-600 text-white shadow-lg shadow-[#7C3AED]/15"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-zinc-400 group-hover:text-zinc-200"
                }`}
              />

              {sidebarOpen && (
                <span className="tracking-wide whitespace-nowrap ">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Status Profile */}
      <div className="p-3 border-t border-white/4 bg-white/1">
        <div className="flex items-center gap-3 px-2 py-2 transition-colors cursor-pointer rounded-xl hover:bg-white/4 group">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-xs font-bold text-white shadow-sm shadow-[#7C3AED]/20">
            AO
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate transition-colors text-zinc-200 group-hover:text-white">
                Ade Olusegun
              </p>
              <p className="text-xs font-medium truncate text-zinc-500">
                ade@flowboard.io
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
