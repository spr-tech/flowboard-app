"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { ArrowBadge } from "@/components/ui/button/arrowBadge";
import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { registerSchema, type RegisterFormValues } from "@/models/validations/authValidation";
import { useRegisterMutation } from "@/services/authService";
import { useInvitePreview } from "@/services/invitesService";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { getPasswordChecks, PasswordChecks } from "../passwordChecks";
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
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // The invite's email arrives after the first render; put it in the (locked) field.
  useEffect(() => {
    if (lockedEmail) setValue("email", lockedEmail, { shouldValidate: false });
  }, [lockedEmail, setValue]);

  // Worked out from the typed values on each render, so there's no state to keep in sync.
  const [password, confirmPassword] = useWatch({ control, name: ["password", "confirmPassword"] });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      // unwrap() turns RTK Query's { data } / { error } result into a value or a thrown AppError.
      await registerAccount(values).unwrap();
    } catch (error) {
      if (isAppError(error) && error.code === "EMAIL_TAKEN") {
        setError("email", { message: error.message }, { shouldFocus: true });
        return;
      }
      setFormError(applyApiError(error, FIELDS, setError));
      return;
    }

    // The account exists; sign in with the same details. values.email is already lowercased by the schema.
    const result = await signIn("credentials", { email: values.email, password: values.password, redirect: false });
    if (result?.error) {
      // Very unlikely, but the account is there, so send them to sign in by hand.
      router.push("/login");
      return;
    }
    router.push(safeCallbackUrl(callbackUrl, window.location.origin));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">
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
        <FormPasswordInput
          control={control}
          name="password"
          label="Password"
          autoComplete="new-password"
          isRevealed={isPasswordRevealed}
          onRevealedChange={setIsPasswordRevealed}
          toggleLabel={{ show: "Show passwords", hide: "Hide passwords" }}
        />
        <FormInput
          control={control}
          name="confirmPassword"
          label="Confirm password"
          type={isPasswordRevealed ? "text" : "password"}
          autoComplete="new-password"
        />
      </div>

      <PasswordChecks checks={getPasswordChecks(password, confirmPassword)} />

      {formError && (
        <p role="alert" className="mt-5 text-center text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button
        text="Create account"
        type="submit"
        variant="inverse"
        size="xl"
        className="mt-6 w-full"
        endIcon={<ArrowBadge />}
        isLoading={isSubmitting}
      />
    </form>
  );
}
