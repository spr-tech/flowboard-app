"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownmenu/dropdownMenu";
import { useMe } from "@/services/accountService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import type { AppShellUser } from "./appShell";

type UserMenuProps = {
  /** From the server session, so the first paint already has a name (no loading flash). */
  user: AppShellUser;
};

export function UserMenu({ user: sessionUser }: UserMenuProps) {
  // Read straight from the RTK Query cache on every render (never copied into state). Once
  // /api/me answers, it wins: a later rename invalidates the Me tag and this updates by itself.
  const { data: me } = useMe();
  const dispatch = useAppDispatch();
  const user = me ? { name: me.name || me.email, email: me.email, imageUrl: me.image } : sessionUser;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label="Account menu"
          startIcon={<Avatar name={user.name} imageUrl={user.imageUrl} />}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-card p-2">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          <span className="truncate text-sm font-semibold text-fg-primary">{user.name}</span>
          <span className="truncate text-sm font-normal text-fg-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2">
          <Link href="/settings">
            <UserRound aria-hidden />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 py-2" onSelect={() => dispatch(dialogOpened({ kind: "signOut" }))}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
