"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { GithubIcon } from "@/components/ui/icons/githubIcon";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { useSignInProgress } from "./signInProgress";

type GithubButtonProps = {
  /** Where to land after GitHub sends the visitor back; checked before use. */
  callbackUrl?: string;
};

/** Starts the GitHub sign-in. The same flow creates the account the first time. */
export function GithubButton({ callbackUrl }: GithubButtonProps) {
  // Shared with the page's form: while any sign-in is under way, the others are disabled.
  const { pending, start, finish } = useSignInProgress();

  const handleClick = () => {
    start("github");
    // The page navigates away to GitHub. If starting fails, hand the page back.
    signIn("github", { redirectTo: safeCallbackUrl(callbackUrl, window.location.origin) }).catch(finish);
  };

  return (
    <Button
      text="Continue with GitHub"
      loadingText="Opening GitHub…"
      variant="inverse"
      size="lg"
      className="w-full"
      startIcon={<GithubIcon />}
      isLoading={pending === "github"}
      disabled={pending !== null}
      onClick={handleClick}
    />
  );
}
