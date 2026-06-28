"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/members": "Members",
  "/settings": "Settings",
};

const TopNav = () => {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "FlowBoard";

  return (
    <header className="bg-[#ffffff] p-3 border border-b-[#E5E7EB] flex justify-between items-center">
      {/* Page title */}
      <h1 className="text-[#111827] font-medium text-base">{title}</h1>

      {/* right side  */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-1.5 w-48">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-xs text-[#9CA3AF]">Search tasks...</span>
        </div>

        {/* Notification bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F9FAFB] border border-[#E5E7EB] transition-colors">
          <Bell className="w-4 h-4 text-[#6B7280]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-xs font-medium cursor-pointer">
          AO
        </div>
      </div>
    </header>
  );
};

export default TopNav;
