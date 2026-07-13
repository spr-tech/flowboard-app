"use client";

import { Bell, Search, PanelLeft, PanelRight, Plus } from "lucide-react";
import Image from "next/image";

type TopNavProps = {
  sidebarToggle: () => void;
  modalToggle: () => void;
  isOpen: boolean;
};

const TopNav = ({ sidebarToggle, modalToggle, isOpen }: TopNavProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-13 bg-white backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 transition-all">
      {/* Left */}
      <div className="flex gap-4 items-center min-w-0">
        <button
          onClick={sidebarToggle}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <PanelRight size={20} /> : <PanelLeft size={20} />}
        </button>
        <h1 className="text-gray-900 font-semibold text-base hidden md:block truncate">
          <div className="h-14 flex items-center gap-2 px-4 border-b border-white/10">
            <Image
              src="/flowboard logo.svg"
              alt="FlowBoard"
              width={30}
              height={30}
            />
            <span className="text-slate-800 font-medium whitespace-nowrap">
              FlowBoard
            </span>
          </div>
        </h1>
      </div>

      {/* Center: Search and Quick Action */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center gap-3">
        {/* Search Bar Wrapper */}
        <div className="flex-1 min-w-30 max-w-md h-10 flex items-center gap-2 bg-gray-50/80 border border-gray-200/80 rounded-xl px-3 transition-all duration-300 focus-within:bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/10 focus-within:shadow-sm">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full bg-transparent outline-none text-gray-800 placeholder:text-gray-400 text-sm"
          />
        </div>

        {/* Create Button Wrapper */}
        <button
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 h-10 rounded-xl shadow-sm shadow-purple-600/10 hover:shadow-purple-700/20 active:scale-[0.98] transition-all shrink-0"
          onClick={modalToggle}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Create</span>
        </button>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors group">
          <Bell className="w-4.5 h-4.5 text-gray-500 group-hover:text-gray-800 transition-colors" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 ring-2 ring-white rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-600/10 flex items-center justify-center text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all">
          AO
        </div>
      </div>
    </header>
  );
};

export default TopNav;
