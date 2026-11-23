"use client";

import type { ReactNode } from "react";

import { NewProjectDialog } from "@/components/content/projects/modals/newProjectDialog";
import { Drawer } from "@/components/ui/drawer/drawer";
import { Logo } from "@/components/ui/logo/logo";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { mobileMenuClosed, mobileMenuOpened, selectIsMobileMenuOpen } from "@/stores/uiSlice";
import { SidebarNav } from "./sidebarNav";
import { SignOutDialog } from "./signOutDialog";
import { SidebarProjects } from "./sidebarProjects";
import { TopBar } from "./topBar";
import { VerifyEmailBanner } from "./verifyEmailBanner";

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
  // UI state in the store's ui slice (src/stores/uiSlice.ts), not useState.
  const dispatch = useAppDispatch();
  const isMenuOpen = useAppSelector(selectIsMobileMenuOpen);
  const closeMenu = () => dispatch(mobileMenuClosed());

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-8 bg-surface-inverse px-4 py-5 md:flex">
        <Logo variant="onDark" className="px-2" />
        <SidebarNav />
        <SidebarProjects />
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
          <SidebarProjects onNavigate={closeMenu} />
        </div>
      </Drawer>

      <div className="flex min-h-dvh flex-col md:pl-60">
        <TopBar user={user} onOpenMenu={() => dispatch(mobileMenuOpened())} />
        <VerifyEmailBanner />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      {/* Dialogs any page can open through the dialog slot, mounted once here: the top bar's
          Create, the dashboard's and the projects page's New project buttons share one dialog. */}
      <NewProjectDialog />
      <SignOutDialog />
    </div>
  );
}
