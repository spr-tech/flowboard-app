"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { SignInPanel } from "@/components/content/auth/signInPanel";
import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { toast } from "@/components/ui/toast/toast";
import { Highlight } from "@/components/ui/typography/highlight";
import { useAcceptInviteMutation, useInvitePreview } from "@/services/invitesService";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { isAppError } from "@/utilities/helpers/applyApiError";
import { maskEmail } from "@/utilities/helpers/inviteLabels";

type InviteScreenProps = {
  token: string;
  /** The signed-in user's email, or null when signed out (read on the server). */
  signedInEmail: string | null;
};

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

/** A link that can't be used any more: what happened, and the way back. */
const DEAD_ENDS = {
  used: {
    heading: "This invite was already used",
    text: "Each invite link works once. If it was yours, the project is in your list.",
  },
  cancelled: {
    heading: "This invite was cancelled",
    text: "The project's owner cancelled it. Ask them for a new one if you still need to join.",
  },
  invalid: {
    heading: "This invite link doesn't work",
    text: "It may have been cut short when it was copied. Use the button in the email, or ask for a new invite.",
  },
} as const;

type DeadEnd = keyof typeof DEAD_ENDS;

/** Accept errors that mean the link itself is no longer good. */
const DEAD_END_CODES: Record<string, DeadEnd> = {
  INVITE_USED: "used",
  INVITE_CANCELLED: "cancelled",
  INVITE_NOT_FOUND: "invalid",
};

function Screen({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <>
      <h1 className={headingClass}>{heading}</h1>
      <div className="mt-4 flex flex-col gap-4 text-fg-secondary">{children}</div>
    </>
  );
}

function ProjectsLink({ isSignedIn }: { isSignedIn: boolean }) {
  return isSignedIn ? (
    <ButtonLink href="/projects" text="Go to your projects" variant="outline" size="lg" className="mt-2 w-full" />
  ) : (
    <ButtonLink href="/login" text="Sign in" variant="outline" size="lg" className="mt-2 w-full" />
  );
}

/**
 * /invite/[token] (docs/plan/01-product-and-flows.md, "Accept invite"). Signed out: create an
 * account (email locked) or sign in, both coming back here. Signed in as the invited email:
 * Join. Signed in as someone else: sign out and continue. Expired, used, cancelled or broken
 * links say so.
 */
export function InviteScreen({ token, signedInEmail }: InviteScreenProps) {
  const router = useRouter();
  const preview = useInvitePreview(token);
  const [acceptInvite, { isLoading: isJoining }] = useAcceptInviteMutation();
  // Accepting can find the link dead after all (used in another tab); that outcome wins.
  const [joinOutcome, setJoinOutcome] = useState<DeadEnd | "expired" | { message: string } | null>(null);
  const here = `/invite/${encodeURIComponent(token)}`;
  const isSignedIn = signedInEmail !== null;

  const join = async () => {
    try {
      const { projectId, projectName } = await acceptInvite(token).unwrap();
      toast({ type: "success", message: `You joined ${projectName}` });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      const code = isAppError(error) ? error.code : "";
      if (code === "INVITE_EXPIRED") setJoinOutcome("expired");
      else if (DEAD_END_CODES[code]) setJoinOutcome(DEAD_END_CODES[code]);
      else setJoinOutcome({ message: isAppError(error) ? error.message : NETWORK_ERROR_MESSAGE });
    }
  };

  const body = (() => {
    if (preview.isLoading) {
      return (
        <p role="status" className="text-fg-secondary">
          Checking your invite…
        </p>
      );
    }
    if (preview.isError || !preview.data) {
      return (
        <>
          <p role="alert" className="mb-6 text-fg-secondary">
            {NETWORK_ERROR_MESSAGE}
          </p>
          <Button text="Try again" variant="secondary" size="lg" className="w-full" onClick={() => preview.refetch()} />
        </>
      );
    }

    const data = preview.data;
    const deadEnd = typeof joinOutcome === "string" && joinOutcome !== "expired" ? joinOutcome : null;
    if (deadEnd || data.state === "used" || data.state === "cancelled" || data.state === "invalid") {
      const { heading, text } = DEAD_ENDS[deadEnd ?? (data.state as DeadEnd)];
      return (
        <Screen heading={heading}>
          <p>{text}</p>
          <ProjectsLink isSignedIn={isSignedIn} />
        </Screen>
      );
    }
    if (joinOutcome === "expired" || data.state === "expired") {
      const inviter = data.state === "expired" || data.state === "valid" ? data.inviterName : "the owner";
      return (
        <Screen
          heading={
            <>
              This invite has <Highlight>expired</Highlight>
            </>
          }
        >
          <p>This invite has expired. Ask {inviter} to send a new one.</p>
          <ProjectsLink isSignedIn={isSignedIn} />
        </Screen>
      );
    }

    if (data.state !== "valid") return null; // Every other state returned above.
    const { project, inviterName, email } = data;
    const intro = (
      <>
        <p>
          {inviterName} invited you to <strong className="text-fg-primary">{project.name}</strong> on Flowboard.
        </p>
        {project.description && <p className="rounded-card bg-surface-sunken px-4 py-3">{project.description}</p>}
      </>
    );

    if (!isSignedIn) {
      return (
        <Screen
          heading={
            <>
              Join <Highlight>{project.name}</Highlight>
            </>
          }
        >
          {intro}
          <ButtonLink
            href={`/register?invite=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(here)}`}
            text="Create an account"
            variant="inverse"
            size="xl"
            className="mt-2 w-full"
          />
          <ButtonLink
            href={`/login?callbackUrl=${encodeURIComponent(here)}`}
            text="Sign in"
            variant="outline"
            size="xl"
            className="w-full"
          />
          <p className="text-sm text-fg-muted">
            Use {email} to create the account or sign in, so the invite finds you.
          </p>
        </Screen>
      );
    }

    if (signedInEmail.toLowerCase() !== email) {
      return (
        <Screen heading="This invite is for someone else">
          <p>
            This invite is for {maskEmail(email)}. You&apos;re signed in as {signedInEmail}.
          </p>
          <Button
            text="Sign out and continue"
            variant="inverse"
            size="xl"
            className="mt-2 w-full"
            onClick={() => void signOut({ redirectTo: here })}
          />
        </Screen>
      );
    }

    return (
      <Screen
        heading={
          <>
            Join <Highlight>{project.name}</Highlight>
          </>
        }
      >
        {intro}
        {joinOutcome && typeof joinOutcome === "object" && (
          <p role="alert" className="text-sm font-medium text-danger">
            {joinOutcome.message}
          </p>
        )}
        <Button
          text={`Join ${project.name}`}
          variant="inverse"
          size="xl"
          className="mt-2 w-full"
          isLoading={isJoining}
          onClick={() => void join()}
        />
      </Screen>
    );
  })();

  return (
    <AuthShell tone="inverse" panel={<SignInPanel />}>
      {body}
    </AuthShell>
  );
}
