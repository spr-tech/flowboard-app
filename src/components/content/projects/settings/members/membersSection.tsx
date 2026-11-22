"use client";

import { InviteForm } from "@/components/content/projects/forms/inviteForm";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useInvites } from "@/services/invitesService";
import { useMembers } from "@/services/membersService";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";
import { MemberRow } from "./memberRow";
import { PendingInvites } from "./pendingInvites";

type MembersSectionProps = { projectId: string; isOwner: boolean; meId: string | null };

/**
 * Project settings, Members (docs/designs/project-settings.md). The owner gets the invite card,
 * Remove on each member, and the pending invites; members see the list only.
 */
export function MembersSection({ projectId, isOwner, meId }: MembersSectionProps) {
  const { data: members, isLoading } = useMembers(projectId);
  const { data: invites } = useInvites(projectId, { skip: !isOwner });
  const showSkeleton = useDelayedFlag(isLoading);

  return (
    <div className="flex flex-col gap-4">
      {isOwner && (
        <div className="rounded-card-lg bg-surface-inverse p-5">
          <InviteForm projectId={projectId} tone="dark" />
        </div>
      )}

      <div aria-busy={isLoading || undefined} className="rounded-card-lg border border-line-subtle p-2">
        {isLoading ? (
          <>
            <p role="status" className="sr-only">
              Loading members
            </p>
            {showSkeleton &&
              [0, 1].map((row) => (
                <div key={row} aria-hidden className="flex items-center gap-3 p-3">
                  <Skeleton className="size-11 rounded-full" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3.5 w-52" />
                  </span>
                </div>
              ))}
          </>
        ) : (
          <ul aria-label="Members">
            {members?.map((member) => (
              <MemberRow
                key={member.id}
                projectId={projectId}
                member={member}
                isMe={member.id === meId}
                canRemove={isOwner && member.role !== "OWNER"}
              />
            ))}
          </ul>
        )}
      </div>

      {isOwner && invites && <PendingInvites projectId={projectId} invites={invites} />}
    </div>
  );
}
