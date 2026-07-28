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
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all bg-white border-b h-13 backdrop-blur-md border-slate-500">
      {/* Left */}
      <div className="flex items-center min-w-0 gap-4">
        <button
          onClick={sidebarToggle}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isOpen ? <PanelRight size={20} /> : <PanelLeft size={20} />}
        </button>
        <h1 className="hidden text-base font-semibold text-gray-900 truncate md:block">
          <div className="flex items-center gap-2 px-4 border-b h-14 border-white/10">
            <Image
              src="/flowboard logo.svg"
              alt="FlowBoard"
              width={30}
              height={30}
            />
            <span className="font-medium text-slate-800 whitespace-nowrap">
              FlowBoard
            </span>
          </div>
        </h1>
      </div>

      {/* Center: Search and Quick Action */}
      <div className="flex items-center justify-center flex-1 max-w-xl gap-3 mx-4">
        {/* Search Bar Wrapper */}
        <div className="flex items-center flex-1 h-10 max-w-md gap-2 px-3 transition-all duration-300 border min-w-30 bg-gray-50/80 border-gray-200/80 rounded-xl focus-within:bg-white focus-within:ring-1 focus-within:ring-purple-400 ">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
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
        <button className="relative flex items-center justify-center transition-colors border border-gray-100 w-9 h-9 rounded-xl hover:bg-gray-50 group">
          <Bell className="w-4.5 h-4.5 text-gray-500 group-hover:text-gray-800 transition-colors" />
          <span className="absolute w-2 h-2 bg-red-500 rounded-full top-2 right-2 ring-2 ring-white"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center justify-center text-xs font-semibold text-white transition-all bg-purple-600 shadow-sm cursor-pointer w-9 h-9 rounded-xl hover:bg-purple-700 shadow-purple-600/10 active:scale-95">
          AO
        </div>
      </div>
    </header>
  );
};

export default TopNav;
