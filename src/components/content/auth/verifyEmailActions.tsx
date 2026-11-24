"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { useStartOverMutation } from "@/services/authService";
import { GoogleButton } from "./googleButton";
import { SignInProgressProvider } from "./signInProgress";

type VerifyEmailActionsProps = {
  email: string;
  /** Where to land after a Google sign-in; checked before use. */
  callbackUrl?: string;
  isGoogleEnabled: boolean;
};

/**
 * The ways out of the code page that don't need the code (the verification gate allows only these):
 * Google instead, a different email, or signing out.
 */
export function VerifyEmailActions({ email, callbackUrl, isGoogleEnabled }: VerifyEmailActionsProps) {
  const [startOver, { isLoading: isStartingOver }] = useStartOverMutation();
  const [isConfirmingStartOver, setIsConfirmingStartOver] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const confirmStartOver = async () => {
    try {
      // Deletes this unconfirmed account if it's empty, so the address is free again.
      await startOver().unwrap();
    } catch {
      return; // The error wrapper has said why; stay here.
    }
    await signOut({ redirectTo: "/register" });
  };

  const signOutHere = () => {
    setIsSigningOut(true);
    void signOut({ redirectTo: "/login" });
  };

  return (
    <div className="mt-8 flex flex-col gap-3 border-t border-line-divider pt-6">
      {isGoogleEnabled && (
        <SignInProgressProvider>
          {/* Signs out first: the server refuses a Google sign-in on top of a valid session. */}
          <GoogleButton text="Continue with Google instead" callbackUrl={callbackUrl} signOutFirst />
        </SignInProgressProvider>
      )}

      {isConfirmingStartOver ? (
        <div role="group" aria-label="Use a different email" className="rounded-card bg-surface-sunken p-4">
          <p className="text-sm text-fg-secondary">
            This removes the account for <strong className="font-semibold text-fg-primary">{email}</strong> so you can
            start again.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              text="Yes, start again"
              loadingText="Starting again…"
              variant="inverse"
              size="sm"
              isLoading={isStartingOver}
              onClick={() => void confirmStartOver()}
            />
            <Button
              text="Cancel"
              variant="ghost"
              size="sm"
              disabled={isStartingOver}
              onClick={() => setIsConfirmingStartOver(false)}
            />
          </div>
        </div>
      ) : (
        <Button
          text="Use a different email"
          variant="secondary"
          size="lg"
          onClick={() => setIsConfirmingStartOver(true)}
        />
      )}

      <Button
        text="Sign out"
        loadingText="Signing out…"
        variant="ghost"
        size="sm"
        className="self-center"
        isLoading={isSigningOut}
        onClick={signOutHere}
      />
    </div>
  );
}
