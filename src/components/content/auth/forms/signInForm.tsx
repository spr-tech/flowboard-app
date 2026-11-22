"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { TextLink } from "@/components/ui/link/textLink";
import { loginSchema, type LoginFormValues } from "@/models/validations/authValidation";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";

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
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const result = await signIn("credentials", { ...values, redirect: false });

    if (result?.error) {
      // The same answer for real and unknown emails (src/server/auth/signInLimit.service.ts).
      setFormError(result.code === RATE_LIMITED ? TOO_MANY_ATTEMPTS : "Invalid email or password");
      return;
    }
    router.push(safeCallbackUrl(callbackUrl, window.location.origin));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4.5">
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
      </div>

      {formError && (
        <p role="alert" className="mt-5 text-center text-sm font-medium text-danger">
          {formError}
        </p>
      )}

      <Button text="Sign in" type="submit" size="xl" className="mt-7 w-full" isLoading={isSubmitting} />
    </form>
  );
}
