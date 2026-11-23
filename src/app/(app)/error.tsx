"use client";

import ErrorContent from "@/components/content/errors/errorContent";

// Inside the app shell, so the sidebar stays usable and the way out is Projects.
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent onRetry={reset} link={{ href: "/projects", text: "Go to your projects" }} />;
}
