"use client";

import ErrorContent from "@/components/content/errors/errorContent";

// Errors on pages outside the app shell (landing, sign in, invites). (app)/error.tsx covers the app.
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent onRetry={reset} link={{ href: "/", text: "Go to the home page" }} isFullPage />;
}
