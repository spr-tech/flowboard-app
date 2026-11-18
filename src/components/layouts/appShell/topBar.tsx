"use client";

import { Menu, Plus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { Logo } from "@/components/ui/logo/logo";
import type { AppShellUser } from "./appShell";
import { UserMenu } from "./userMenu";

type TopBarProps = {
  user: AppShellUser;
  onOpenMenu: () => void;
};

export function TopBar({ user, onOpenMenu }: TopBarProps) {
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
        {/* Opens the "New project" dialog from milestone 5; does nothing until then. */}
        <Button text="Create" size="sm" startIcon={<Plus />} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
