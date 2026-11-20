"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { GithubIcon } from "@/components/ui/icons/githubIcon";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";

type GithubButtonProps = {
  /** Where to land after GitHub sends the visitor back; checked before use. */
  callbackUrl?: string;
};

/** Starts the GitHub sign-in. The same flow creates the account the first time. */
export function GithubButton({ callbackUrl }: GithubButtonProps) {
  // The page navigates away to GitHub, so this only needs to stop a second click meanwhile.
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = () => {
    setIsRedirecting(true);
    void signIn("github", { redirectTo: safeCallbackUrl(callbackUrl, window.location.origin) });
  };

  return (
    <Button
      text="Continue with GitHub"
      variant="inverse"
      size="lg"
      className="w-full"
      startIcon={<GithubIcon />}
      isLoading={isRedirecting}
      onClick={handleClick}
    />
  );
}
