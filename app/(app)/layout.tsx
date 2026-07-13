"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import { useState, useEffect } from "react";
import CreateProjectModal from "@/components/modals/CreateProjectModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Overlay  mobile only, shows when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <TopNav
        isOpen={sidebarOpen}
        sidebarToggle={() => setSidebarOpen((prev) => !prev)}
        modalToggle={() => setModalOpen((prev) => !prev)}
      />

      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out mt-13 ${
          isMobile ? "" : sidebarOpen ? "pl-60" : "pl-14"
        }`}
      >
        <Sidebar
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => isMobile && setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 bg-[#F9FAFB] p-5 overflow-y-auto">
          {children}
          {modalOpen && (
            <CreateProjectModal onClose={() => setModalOpen(false)} />
          )}
        </main>
      </div>
    </div>
  );
}
