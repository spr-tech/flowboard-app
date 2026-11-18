"use client";

import { useState, type ReactNode } from "react";

import { Drawer } from "@/components/ui/drawer/drawer";
import { Logo } from "@/components/ui/logo/logo";
import { SidebarNav } from "./sidebarNav";
import { TopBar } from "./topBar";

export type AppShellUser = {
  name: string;
  email: string;
  imageUrl?: string | null;
};

type AppShellProps = {
  user: AppShellUser;
  children: ReactNode;
};

/**
 * Sidebar + top bar around every signed-in page.
 * Desktop (md and up): fixed sidebar. Phone: the sidebar moves into a drawer opened from the top bar.
 * Layout switches on CSS breakpoints, never on window width, so the first paint is already right.
 */
export function AppShell({ user, children }: AppShellProps) {
  // Local for now; moves to the UI slice in src/stores when the Redux store exists (milestone 4).
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-8 bg-surface-inverse px-4 py-5 md:flex">
        <Logo variant="onDark" className="px-2" />
        <SidebarNav />
      </aside>

      <Drawer
        isOpen={isMenuOpen}
        onClose={closeMenu}
        title="Menu"
        isTitleHidden
        side="left"
        width="sm"
        className="border-0 bg-surface-inverse text-fg-on-inverse"
      >
        <div className="flex flex-col gap-8 pt-5">
          <Logo variant="onDark" className="px-2" />
          <SidebarNav onNavigate={closeMenu} />
        </div>
      </Drawer>

      <div className="flex min-h-dvh flex-col md:pl-60">
        <TopBar user={user} onOpenMenu={() => setIsMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
