"use client";

import "./globals.css";
import ErrorContent from "@/components/content/errors/errorContent";
import { fontVariables } from "@/configs/fonts";

// Replaces the root layout when the root layout itself fails, so it brings its own <html> and <body>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ErrorContent onRetry={reset} link={{ href: "/", text: "Go to the home page" }} isFullPage />
      </body>
    </html>
  );
}
