"use client";

import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { InviteResponse } from "@/models/responses/memberResponses";
import { useCancelInviteMutation, useResendInviteMutation } from "@/services/invitesService";
import { cn } from "@/utilities/helpers/cn";
import { inviteNote } from "@/utilities/helpers/inviteLabels";

type PendingInvitesProps = { projectId: string; invites: InviteResponse[] };

/** The owner's pending invites: "Sent N days ago · expires in N days" (or expired, in red), Resend, Cancel invite. */
export function PendingInvites({ projectId, invites }: PendingInvitesProps) {
  const [resendInvite, resendState] = useResendInviteMutation();
  const [cancelInvite, cancelState] = useCancelInviteMutation();

  const resend = async (invite: InviteResponse) => {
    try {
      await resendInvite({ projectId, inviteId: invite.id }).unwrap();
      toast({ type: "success", message: `Invite resent to ${invite.email}` });
    } catch {
      // The base query showed why.
    }
  };

  const cancel = async (invite: InviteResponse) => {
    try {
      await cancelInvite({ projectId, inviteId: invite.id }).unwrap();
      toast({ type: "success", message: `Invite to ${invite.email} cancelled` });
    } catch {
      // The base query showed why.
    }
  };

  if (invites.length === 0) return null;

  return (
    <section aria-labelledby="pending-invites" className="rounded-card-lg border border-line-subtle p-2">
      <h3 id="pending-invites" className="px-1 pt-3 pb-1 text-[13px] font-semibold text-fg-secondary">
        Pending invites
      </h3>
      <ul>
        {invites.map((invite) => {
          const note = inviteNote(invite);
          const isBusy =
            (resendState.isLoading && resendState.originalArgs?.inviteId === invite.id) ||
            (cancelState.isLoading && cancelState.originalArgs?.inviteId === invite.id);
          return (
            <li key={invite.id} className="flex flex-wrap items-center gap-3 rounded-2xl p-3">
              <span
                aria-hidden
                className="inline-flex size-10 flex-none items-center justify-center rounded-full border border-dashed border-line-strong text-fg-muted"
              >
                <Mail className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold break-all sm:truncate">{invite.email}</span>
                <span className={cn("block text-sm", note.isExpired ? "text-danger" : "text-fg-muted")}>
                  {note.text}
                </span>
              </span>
              <Button
                text="Resend"
                variant="secondary"
                size="sm"
                aria-label={`Resend invite to ${invite.email}`}
                disabled={isBusy}
                onClick={() => void resend(invite)}
              />
              <Button
                text="Cancel invite"
                variant="ghost"
                size="sm"
                className="text-danger"
                aria-label={`Cancel invite to ${invite.email}`}
                disabled={isBusy}
                onClick={() => void cancel(invite)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
