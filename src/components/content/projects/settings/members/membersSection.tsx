"use client";

import { InviteForm } from "@/components/content/projects/forms/inviteForm";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useInvites } from "@/services/invitesService";
import { useMembers } from "@/services/membersService";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { MANAGER_LIMIT } from "@/utilities/helpers/permissions";
import { projectCan } from "@/utilities/helpers/projectPermissions";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";
import { MemberRow } from "./memberRow";
import { PendingInvites } from "./pendingInvites";

type MembersSectionProps = { project: Pick<ProjectDetail, "id" | "me" | "memberTakeLimit">; meId: string | null };

/**
 * Project settings, Members (docs/designs/project-settings.md). Whoever may invite (the owner,
 * managers with inviteMembers) gets the invite card and the pending invites. The owner changes
 * roles and managers' permissions; Remove shows where can() allows it (a manager with
 * removeMembers: members only). Everyone else sees the list.
 */
export function MembersSection({ project, meId }: MembersSectionProps) {
  const projectId = project.id;
  const mayInvite = projectCan(project, meId, "member.invite").allowed;
  const canManageRole = projectCan(project, meId, "member.changeRole").allowed;
  const { data: members, isLoading } = useMembers(projectId);
  const { data: invites } = useInvites(projectId, { skip: !mayInvite });
  const managersFull = (members?.filter((member) => member.role === "MANAGER").length ?? 0) >= MANAGER_LIMIT;
  const showSkeleton = useDelayedFlag(isLoading);

  return (
    <div className="flex flex-col gap-4">
      {mayInvite && (
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
                canRemove={
                  member.id !== meId &&
                  projectCan(project, meId, "member.remove", { target: { role: member.role } }).allowed
                }
                canManageRole={canManageRole}
                managersFull={managersFull}
              />
            ))}
          </ul>
        )}
      </div>

      {mayInvite && invites && <PendingInvites projectId={projectId} invites={invites} />}
    </div>
  );
}
