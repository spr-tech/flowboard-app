"use client";

import { StatusShell } from "@/components/layouts/statusShell/statusShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";

type ErrorContentProps = {
  /** Re-renders the part that failed (the error boundary's reset). */
  onRetry: () => void;
  /** Where "get me out of here" goes: home outside the app, Projects inside it. */
  link: { href: string; text: string };
  /** Outside the app shell the message gets the whole page, with the logo. */
  isFullPage?: boolean;
};

/**
 * What an error boundary shows. Never the error's message or stack: those can carry internals,
 * and they mean nothing to the person using the app. The browser console still has them.
 */
export default function ErrorContent({ onRetry, link, isFullPage = false }: ErrorContentProps) {
  const message = (
    <section className="flex flex-col items-start gap-4">
      <title>Something went wrong · Flowboard</title>
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="text-fg-secondary">
        Sorry, this page didn&apos;t load. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button text="Try again" onClick={onRetry} />
        <ButtonLink href={link.href} text={link.text} variant="secondary" />
      </div>
    </section>
  );
  return isFullPage ? <StatusShell>{message}</StatusShell> : message;
}
