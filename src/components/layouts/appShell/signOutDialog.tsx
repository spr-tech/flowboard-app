"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { dialogClosed, selectOpenDialog } from "@/stores/uiSlice";

/**
 * "Sign out of Flowboard?" Opened from the user menu and from Account settings → Session, through
 * the dialog slot ({ kind: "signOut" }), and mounted once in the app shell.
 * Cancel comes first in the footer, so Radix focuses it when the dialog opens; Escape and the
 * overlay cancel too. Signing out reloads the page at /login, so the spinner never has to stop.
 */
export function SignOutDialog() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectOpenDialog)?.kind === "signOut";
  // Local UI state: whether this click is in flight. Not server data, so not in the cache.
  const [isSigningOut, setIsSigningOut] = useState(false);
  const close = () => {
    if (!isSigningOut) dispatch(dialogClosed());
  };

  const confirm = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      // Network failure: let them try again (the page didn't navigate away).
      setIsSigningOut(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title="Sign out of Flowboard?"
      description="You'll need to sign in again on this device."
      width="sm"
      footer={
        <>
          <Button text="Cancel" variant="secondary" onClick={close} disabled={isSigningOut} />
          <Button text="Sign out" variant="danger" onClick={() => void confirm()} isLoading={isSigningOut} />
        </>
      }
    />
  );
}
