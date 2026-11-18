"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerNewUser } from "@/app/actions/auth";
import { ArrowBadge } from "@/components/ui/button/arrowBadge";
import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { toast } from "@/components/ui/toast/toast";
import {
  PASSWORD_MIN_LENGTH,
  registerSchema,
  type RegisterFormValues,
} from "@/models/validations/authValidation";
import { PasswordChecks } from "./passwordChecks";

/**
 * Email sign-up through the existing registerNewUser server action.
 * The logic is the pre-rebuild one, kept as is; milestone 3 replaces it.
 */
export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  // One toggle reveals both password fields, as in the design.
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // Worked out from the typed values on each render, so there's no state to keep in sync.
  const [password, confirmPassword] = useWatch({ control, name: ["password", "confirmPassword"] });
  const checks = [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, isMet: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Passwords match", isMet: password.length > 0 && password === confirmPassword },
  ];

  const onSubmit = async ({ name, email, password }: RegisterFormValues) => {
    setFormError(null);
    const result = await registerNewUser({ name, email, password });

    if (!result.success) {
      setFormError(result.error?.trim() || "Something went wrong. Please try again.");
      return;
    }
    toast({ type: "success", message: "Account created. Sign in to continue." });
    router.push("/login");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">
        <FormInput
          control={control}
          name="name"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Okafor"
        />
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

      <PasswordChecks checks={checks} />

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
