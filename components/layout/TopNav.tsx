"use client";

import { Bell, Search, PanelLeft, Plus } from "lucide-react";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/members": "Members",
  "/settings": "Settings",
};

type TopNavProps = {
  onToggle: () => void;
  modalSwitch: () => void;
};

const TopNav = ({ onToggle, modalSwitch }: TopNavProps) => {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "FlowBoard";

  return (
    <header className="bg-[#ffffff] p-3 border border-b-[#E5E7EB] flex justify-between items-center overflow-hidden">
      <div className="flex gap-4 items-center text-[#111827] ">
        <button onClick={onToggle}>
          <PanelLeft size={20} />
        </button>
        {/* Page title */}
        <h1 className="text-[#111827] font-medium text-base hidden md:block">
          {title}
        </h1>
      </div>

      <div className="flex justify-between md:justify-center items-center gap-3 mx-2 w-full">
        {/* The Search Bar Wrapper */}
        <div className="w-36  sm:w-44 sm:focus-within:w-64 md:w-80 md:focus-within:w-96 transition-all duration-300 h-10 flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 focus-within:border-[#7C3AED] focus-within:ring-1 focus-within:ring-[#7C3AED]">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="search tasks.."
            className="w-full bg-transparent outline-none border-none text-slate-800 placeholder:text-slate-400 text-sm"
          />
        </div>

        {/* The Create Button Wrapper */}
        <div className="shrink-0">
          <button
            className="flex items-center gap-1 bg-[#7C3AED] text-white text-sm font-medium px-3 h-10 rounded-lg cursor-pointer hover:bg-[#6D28D9] transition-colors"
            onClick={modalSwitch}
          >
            <Plus size={20} />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* right side  */}
      <div className="flex items-center gap-3">
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
