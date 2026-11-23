import { StatusShell } from "@/components/layouts/statusShell/statusShell";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Highlight } from "@/components/ui/typography/highlight";

/**
 * The not-found page: an unknown address, or a project that doesn't exist or I'm not in
 * (the two look the same on purpose). Signed-in people go back to their projects.
 */
export default function NotFoundContent({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <StatusShell>
      <section className="flex flex-col items-start gap-5">
        <p className="font-heading text-5xl font-extrabold tracking-tight">
          <Highlight>404</Highlight>
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="text-lg text-fg-secondary">
          The link may be old or mistyped. If it was a project, it may have been deleted, or you may no longer be a
          member.
        </p>
        {isSignedIn ? (
          <ButtonLink href="/projects" text="Go to your projects" />
        ) : (
          <ButtonLink href="/" text="Go to the home page" />
        )}
      </section>
    </StatusShell>
  );
}
