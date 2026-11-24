"use client";

import { signIn, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { GoogleIcon } from "@/components/ui/icons/googleIcon";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { useSignInProgress } from "./signInProgress";

type GoogleButtonProps = {
  /** Where to land after Google sends the visitor back; checked before use. */
  callbackUrl?: string;
  /** "Continue with Google instead" on the code page. */
  text?: string;
  /**
   * Sign out first. Needed wherever someone may already be signed in (the code page): the server
   * refuses a Google sign-in on top of a valid session (oauthSignIn.service.ts).
   */
  signOutFirst?: boolean;
};

/**
 * Starts the Google sign-in; the same flow creates the account the first time. Styled to Google's
 * sign-in guidelines (white, grey border, dark text, the standard "G"), which read well on our
 * cream background. Pages render it only when Google sign-in is set up (isGoogleSignInEnabled).
 */
export function GoogleButton({ callbackUrl, text = "Continue with Google", signOutFirst = false }: GoogleButtonProps) {
  // Shared with the page's other ways to sign in: while any is under way, the others are disabled.
  const { pending, start, finish } = useSignInProgress();

  const handleClick = async () => {
    start("google");
    try {
      if (signOutFirst) await signOut({ redirect: false });
      // The page navigates away to Google.
      await signIn("google", { redirectTo: safeCallbackUrl(callbackUrl, window.location.origin) });
    } catch {
      // Couldn't start: hand the page back.
      finish();
    }
  };

  return (
    <Button
      text={text}
      loadingText="Opening Google…"
      variant="secondary"
      size="lg"
      className="w-full border-google-button-border bg-google-button-surface text-google-button-fg hover:bg-google-button-surface hover:brightness-95"
      startIcon={<GoogleIcon />}
      isLoading={pending === "google"}
      disabled={pending !== null}
      onClick={() => void handleClick()}
    />
  );
}
