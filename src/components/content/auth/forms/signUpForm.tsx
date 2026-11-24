"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { ArrowBadge } from "@/components/ui/button/arrowBadge";
import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { registerSchema, type RegisterFormValues } from "@/models/validations/authValidation";
import { useRegisterMutation } from "@/services/authService";
import { useInvitePreview } from "@/services/invitesService";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { useNoAngleBrackets } from "@/utilities/hooks/useNoAngleBrackets";
import { TextLink } from "@/components/ui/link/textLink";
import { useSignInProgress } from "../signInProgress";
import { getPasswordChecks, PasswordChecks } from "../passwordChecks";
import { PasswordStrengthMeter } from "../passwordStrengthMeter";
import { applyApiError, isAppError } from "@/utilities/helpers/applyApiError";

const FIELDS = ["name", "email", "password", "confirmPassword"] as const;

type SignUpFormProps = {
  /** Where to go once the account exists, straight from the URL; checked before use. */
  callbackUrl?: string;
  /** From ?invite=: a live invite's email is filled in and locked, so the account matches it. */
  inviteToken?: string;
};

/** Creates the account through POST /api/auth/register, then signs straight in (product flow 1). */
export function SignUpForm({ callbackUrl, inviteToken }: SignUpFormProps) {
  const router = useRouter();
  const [registerAccount] = useRegisterMutation();
  const invite = useInvitePreview(inviteToken ?? "", { skip: !inviteToken });
  const lockedEmail = invite.data?.state === "valid" ? invite.data.email : undefined;
  const [formError, setFormError] = useState<string | null>(null);
  // One toggle reveals both password fields, as in the design.
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { isSubmitting },
  } = form;
  useNoAngleBrackets(form, "password");
  // Shared with the GitHub button. Stays set after success, while the next page loads.
  const progress = useSignInProgress();
  const isLocked = isSubmitting || progress.pending !== null;

  // The invite's email arrives after the first render; put it in the (locked) field.
  useEffect(() => {
    if (lockedEmail) setValue("email", lockedEmail, { shouldValidate: false });
  }, [lockedEmail, setValue]);

  // Worked out from the typed values on each render, so there's no state to keep in sync.
  const [name, email, password, confirmPassword] = useWatch({
    control,
    name: ["name", "email", "password", "confirmPassword"],
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    let needsEmailCode = true;
    progress.start("password");
    try {
      // unwrap() turns RTK Query's { data } / { error } result into a value or a thrown AppError.
      // The invite's token goes along only when its email is the one locked in the field: then the
      // server skips the code, because accepting the invite confirms the email.
      const created = await registerAccount({ ...values, inviteToken: lockedEmail ? inviteToken : undefined }).unwrap();
      needsEmailCode = created.needsEmailCode;
    } catch (error) {
      if (isAppError(error) && error.code === "EMAIL_TAKEN") {
        setError("email", { message: error.message }, { shouldFocus: true });
        progress.finish();
        return;
      }
      setFormError(applyApiError(error, FIELDS, setError));
      progress.finish();
      return;
    }

    // The account exists; sign in with the same details. values.email is already lowercased by the schema.
    const result = await signIn("credentials", { email: values.email, password: values.password, redirect: false });
    if (result?.error) {
      // Very unlikely, but the account is there, so send them to sign in by hand.
      router.push("/login");
      return;
    }
    const destination = safeCallbackUrl(callbackUrl, window.location.origin);
    // Next: the code that was just emailed, then where they were going.
    router.push(needsEmailCode ? `/verify-email?callbackUrl=${encodeURIComponent(destination)}` : destination);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormFieldset disabled={isLocked} className="flex flex-col gap-4">
        <FormInput control={control} name="name" label="Full name" autoComplete="name" placeholder="Ada Okafor" />
        <FormInput
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          readOnly={Boolean(lockedEmail)}
          helperText={lockedEmail ? "This is the address your invite was sent to." : undefined}
          className={lockedEmail ? "bg-surface-sunken text-fg-secondary" : undefined}
        />
        <div>
          <FormPasswordInput
            control={control}
            name="password"
            label="Password"
            autoComplete="new-password"
            isRevealed={isPasswordRevealed}
            onRevealedChange={setIsPasswordRevealed}
            toggleLabel={{ show: "Show passwords", hide: "Hide passwords" }}
          />
          <PasswordStrengthMeter password={password} who={{ name, email }} />
        </div>
        <FormInput
          control={control}
          name="confirmPassword"
          label="Confirm password"
          type={isPasswordRevealed ? "text" : "password"}
          autoComplete="new-password"
        />
      </FormFieldset>

      <PasswordChecks checks={getPasswordChecks(password, confirmPassword)} />

      {formError && (
        <p role="alert" className="mt-5 text-center text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button
        text="Create account"
        loadingText="Creating account…"
        type="submit"
        variant="inverse"
        size="xl"
        className="mt-6 w-full"
        endIcon={<ArrowBadge />}
        isLoading={progress.pending === "password"}
        disabled={isLocked}
      />

      <p className="mt-4 text-center text-sm text-fg-secondary">
        By creating an account, you agree to the <TextLink href="/terms">Terms</TextLink> and{" "}
        <TextLink href="/privacy">Privacy Policy</TextLink>.
      </p>
    </form>
  );
}
