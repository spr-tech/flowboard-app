"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { InviteResponse } from "@/models/responses/memberResponses";
import { useCancelInviteMutation, useResendInviteMutation } from "@/services/invitesService";
import { cn } from "@/utilities/helpers/cn";
import { inviteNote } from "@/utilities/helpers/inviteLabels";

/** How many invites show at once; Previous / Next page through the rest. */
export const INVITES_PER_PAGE = 3;

type PendingInvitesProps = { projectId: string; invites: InviteResponse[] };

/**
 * Pending invites: "Sent N days ago · expires in N days" (or expired, in red), Resend, Cancel invite.
 * Three at a time, with Previous / Next once there are more, so the page doesn't keep growing.
 * On phones each row stacks: envelope and email, then the buttons underneath.
 */
export function PendingInvites({ projectId, invites }: PendingInvitesProps) {
  const [resendInvite, resendState] = useResendInviteMutation();
  const [cancelInvite, cancelState] = useCancelInviteMutation();
  const [page, setPage] = useState(0);

  // Cancelling the last invite on the last page would leave it empty: show the page before instead.
  const pageCount = Math.max(1, Math.ceil(invites.length / INVITES_PER_PAGE));
  const current = Math.min(page, pageCount - 1);
  const first = current * INVITES_PER_PAGE;
  const shown = invites.slice(first, first + INVITES_PER_PAGE);

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
        {shown.map((invite) => {
          const note = inviteNote(invite);
          const isBusy =
            (resendState.isLoading && resendState.originalArgs?.inviteId === invite.id) ||
            (cancelState.isLoading && cancelState.originalArgs?.inviteId === invite.id);
          return (
            <li
              key={invite.id}
              className="flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  aria-hidden
                  className="inline-flex size-10 flex-none items-center justify-center rounded-full border border-dashed border-line-strong text-fg-muted"
                >
                  <Mail className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  {/* One line, ending in "…" when it doesn't fit; hover shows it all. */}
                  <span className="block truncate font-semibold" title={invite.email}>
                    {invite.email}
                  </span>
                  <span className={cn("block text-sm", note.isExpired ? "text-danger" : "text-fg-muted")}>
                    {note.text}
                  </span>
                </span>
              </span>
              {/* On phones the buttons sit on their own line, lined up under the email. */}
              <span className="flex flex-wrap items-center gap-2 max-sm:pl-13">
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
              </span>
            </li>
          );
        })}
      </ul>
      {pageCount > 1 && (
        <div
          role="group"
          aria-label="Pending invites pages"
          className="flex items-center justify-between gap-2 border-t border-line-subtle px-1 pt-2 pb-1"
        >
          <Button
            text="Previous"
            variant="ghost"
            size="sm"
            startIcon={<ChevronLeft aria-hidden />}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          />
          <p role="status" className="text-sm text-fg-muted">
            {first + 1}–{first + shown.length} of {invites.length}
          </p>
          <Button
            text="Next"
            variant="ghost"
            size="sm"
            endIcon={<ChevronRight aria-hidden />}
            disabled={current === pageCount - 1}
            onClick={() => setPage(current + 1)}
          />
        </div>
      )}
    </section>
  );
}
