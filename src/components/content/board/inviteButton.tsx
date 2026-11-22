"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";

/** Owner only: opens the Invite dialog (the typed dialog slot). */
export function InviteButton() {
  const dispatch = useAppDispatch();
  return (
    <Button
      text="Invite"
      variant="inverse"
      startIcon={<UserPlus aria-hidden />}
      onClick={() => dispatch(dialogOpened({ kind: "invite" }))}
    />
  );
}
