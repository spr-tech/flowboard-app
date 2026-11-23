"use client";

import { Menu, Plus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { Logo } from "@/components/ui/logo/logo";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import type { AppShellUser } from "./appShell";
import { UserMenu } from "./userMenu";

type TopBarProps = {
  user: AppShellUser;
  onOpenMenu: () => void;
};

export function TopBar({ user, onOpenMenu }: TopBarProps) {
  const dispatch = useAppDispatch();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line-subtle bg-surface-page px-4 md:px-8">
      {/* Phone only: the sidebar is hidden, so the menu button and logo take its place. */}
      <Button
        variant="ghost"
        aria-label="Open menu"
        startIcon={<Menu />}
        onClick={onOpenMenu}
        className="-ml-2 md:hidden"
      />
      <Logo className="md:hidden" />

      <div className="ml-auto flex items-center gap-2">
        {/* The same dialog slot as the dashboard's and the projects page's New project buttons. */}
        <Button
          text="Create"
          size="sm"
          startIcon={<Plus aria-hidden />}
          onClick={() => dispatch(dialogOpened({ kind: "newProject" }))}
        />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
