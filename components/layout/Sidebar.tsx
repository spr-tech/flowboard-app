"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, Users, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Members", href: "/members", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

type sideBarProps = {
  isOpen: boolean;
  isMobile: boolean;
};

export default function Sidebar({ isOpen, isMobile }: sideBarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`min-h-screen bg-[#1E1B2E] flex flex-col shrink-0 transition-all duration-300 z-40
    ${
      isMobile
        ? `fixed inset-y-0 left-0 w-60 ${isOpen ? "translate-x-0" : "-translate-x-full"}`
        : `relative ${isOpen ? "w-60" : "w-14 "}`
    }
    
  `}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/8">
        <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center shrink-0 ">
          <LayoutDashboard className="text-white w-4 h-4" />
        </div>
        {isOpen && (
          <span className="text-white font-medium text-base">FlowBoard</span>
        )}
      </div>
      {/* Nav items */}
      <nav
        className={`flex-1 py-4 flex flex-col gap-1 ${isOpen ? "px-3" : "px-2"}`}
      >
        {" "}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-[#7C3AED]/30 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isOpen && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
      {/* User section at bottom */}
      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            AO
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">
              Ade Olusegun
            </div>
            <div className="text-white/40 text-xs truncate">
              ade@flowboard.io
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
