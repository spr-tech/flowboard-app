"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { TextLink } from "@/components/ui/link/textLink";
import { loginSchema, type LoginFormValues } from "@/models/validations/authValidation";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { useFocusAfterSubmit } from "@/utilities/hooks/useFocusAfterSubmit";
import { useSignInProgress } from "../signInProgress";

type SignInFormProps = {
  /** Where to go after signing in, straight from the URL; checked before use. */
  callbackUrl?: string;
};

/** Set by the server after 5 failed attempts for an email in 15 minutes. */
const RATE_LIMITED = "rate_limited";
export const TOO_MANY_ATTEMPTS = "Too many attempts. Try again in a few minutes.";

/** Email and password sign-in through the Auth.js Credentials provider. */
export function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  // A wrong password isn't a field error and isn't a request failure, so it lives here,
  // shown above the button, rather than in a toast.
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const {
    control,
    handleSubmit,
    resetField,
    setFocus,
    formState: { isSubmitting },
  } = form;
  // Shared with the GitHub button. Stays set after a successful sign-in, while the next page loads.
  const progress = useSignInProgress();
  const isLocked = isSubmitting || progress.pending !== null;
  const focusAfterSubmit = useFocusAfterSubmit(setFocus, isLocked);

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    progress.start("password");
    const result = await signIn("credentials", { ...values, redirect: false });

    if (result?.error) {
      // The same answer for real and unknown emails (src/server/auth/signInLimit.service.ts).
      setFormError(result.code === RATE_LIMITED ? TOO_MANY_ATTEMPTS : "Invalid email or password");
      // Keep the email; clear the password and put the cursor back in it.
      resetField("password");
      focusAfterSubmit("password");
      progress.finish();
      return;
    }
    router.push(safeCallbackUrl(callbackUrl, window.location.origin));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormFieldset disabled={isLocked} className="flex flex-col gap-4.5">
        <FormInput
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
        />
        <FormPasswordInput
          control={control}
          name="password"
          label="Password"
          autoComplete="current-password"
          labelEnd={
            <TextLink href="/forgot-password" className="text-sm">
              Forgot password?
            </TextLink>
          }
        />
      </FormFieldset>

      {formError && (
        <p role="alert" className="mt-5 text-center text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button
        text="Sign in"
        loadingText="Signing in…"
        type="submit"
        size="xl"
        className="mt-7 w-full"
        isLoading={progress.pending === "password"}
        disabled={isLocked}
      />
    </form>
  );
}
