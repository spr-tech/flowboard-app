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
    <header className="bg-[#ffffff] p-3 border border-b-[#E5E7EB] flex justify-between items-center">
      <div className="flex gap-4 items-center text-[#111827] ">
        <button onClick={onToggle}>
          <PanelLeft size={20} />
        </button>
        {/* Page title */}
        <h1 className="text-[#111827] font-medium text-base hidden md:block">
          {title}
        </h1>
      </div>

      <div className="flex flex-1 justify-center items-center gap-3">
        <div className=" w-70 md:w-90 h-10 flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-1.5 ">
          <Search size={20} className="text-slate-400 " />
          <input
            type="text"
            placeholder="search tasks.."
            className=" flex-1 w-50 outline-0 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div>
          <button
            className=" flex items-center gap-1 bg-[#7C3AED] p-1 rounded-lg cursor-pointer hover:bg-[#6C3AEa] "
            onClick={modalSwitch}
          >
            <Plus size={20} />
            Create
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
