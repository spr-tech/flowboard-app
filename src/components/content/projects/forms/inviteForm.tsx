"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { inviteSchema, type InviteFormValues } from "@/models/validations/memberValidation";
import { useMe } from "@/services/accountService";
import { useCreateInviteMutation } from "@/services/invitesService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { cn } from "@/utilities/helpers/cn";

type InviteFormProps = {
  projectId: string;
  /** "dark": the espresso card in project settings. "light": the board's Invite dialog. */
  tone: "dark" | "light";
};

const tones = {
  dark: {
    label: "text-fg-on-inverse",
    input:
      "border-fg-muted-on-inverse/40 bg-surface-inverse-raised text-fg-on-inverse placeholder:text-fg-muted-on-inverse",
    ok: "text-highlight",
    error: "text-status-high",
    button: "bg-highlight text-fg-on-highlight hover:bg-highlight/90",
    note: "text-fg-muted-on-inverse",
  },
  light: {
    label: "text-fg-primary",
    input: "border-line-strong bg-surface-card text-fg-primary placeholder:text-fg-muted",
    ok: "text-status-done-fg",
    error: "text-danger",
    button: "",
    note: "text-fg-secondary",
  },
} as const;

/**
 * Shown instead of the form until the owner's email is confirmed (the server would answer 403
 * EMAIL_NOT_VERIFIED anyway): the reason, and the way to fix it.
 */
function ConfirmEmailFirst({ tone }: { tone: InviteFormProps["tone"] }) {
  const pathname = usePathname();
  const style = tones[tone];
  return (
    <div className="flex flex-col gap-2.5">
      <p className={cn("text-sm font-semibold", style.label)}>Invite by email</p>
      <p className={cn("text-sm", style.note)}>Confirm your email before inviting people.</p>
      <ButtonLink
        text="Enter code"
        href={`/verify-email?callbackUrl=${encodeURIComponent(pathname)}`}
        className={cn("h-12 self-start", style.button)}
      />
    </div>
  );
}

/**
 * Invite by email (owner only), once the owner's email is confirmed. The answer shows under the field: "Invite sent to …", "There was
 * already an invite for …, so we sent it again.", or "<name> is already a member.". A failed send
 * is a toast (the base query's), since it isn't about what was typed.
 */
export function InviteForm({ projectId, tone }: InviteFormProps) {
  const { data: me } = useMe();
  // While Me loads, the form shows; the server still refuses an unconfirmed sender.
  if (me && !me.emailVerified) return <ConfirmEmailFirst tone={tone} />;
  return <InviteEmailForm projectId={projectId} tone={tone} />;
}

function InviteEmailForm({ projectId, tone }: InviteFormProps) {
  const id = useId();
  const style = tones[tone];
  const [createInvite] = useCreateInviteMutation();
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: InviteFormValues) => {
    setSentMessage(null);
    try {
      const invite = await createInvite({ projectId, email }).unwrap();
      reset();
      setSentMessage(
        invite.resent
          ? `There was already an invite for ${invite.email}, so we sent it again.`
          : `Invite sent to ${invite.email}.`
      );
    } catch (error) {
      // Field problems ("already a member", a bad address) go under the field; anything else
      // has been shown as a toast by the base query.
      applyApiError(error, ["email"], setError);
    }
  };

  const message = errors.email?.message ?? sentMessage;
  const inputId = `${id}-email`;
  const messageId = `${id}-message`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2.5">
      <label htmlFor={inputId} className={cn("text-sm font-semibold", style.label)}>
        Invite by email
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id={inputId}
          type="email"
          autoComplete="off"
          placeholder="teammate@company.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={messageId}
          {...register("email", { onChange: () => setSentMessage(null) })}
          className={cn(
            "h-12 min-w-0 flex-[1_1_220px] rounded-input border-[1.5px] px-3.5 text-[15px] outline-none",
            "focus-visible:ring-4 focus-visible:ring-focus",
            style.input
          )}
        />
        <Button text="Send invite" type="submit" isLoading={isSubmitting} className={cn("h-12", style.button)} />
      </div>
      <p
        id={messageId}
        role="status"
        className={cn("min-h-5 text-sm", errors.email ? style.error : style.ok, !message && "sr-only")}
      >
        {message}
      </p>
    </form>
  );
}
