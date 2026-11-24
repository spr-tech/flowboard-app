"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getPasswordChecks, PasswordChecks } from "@/components/content/auth/passwordChecks";
import { PasswordStrengthMeter } from "@/components/content/auth/passwordStrengthMeter";
import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import { toast } from "@/components/ui/toast/toast";
import type { MeResponse } from "@/models/responses/meResponses";
import { changePasswordFormSchema, type ChangePasswordValues } from "@/models/validations/authValidation";
import { useChangePasswordMutation } from "@/services/accountService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { useNoAngleBrackets } from "@/utilities/hooks/useNoAngleBrackets";

const FIELDS = ["currentPassword", "password", "confirmPassword"] as const;
const EMPTY = { currentPassword: "", password: "", confirmPassword: "" };

/**
 * Current, new and confirm, with the live checks and one show/hide toggle for all three. Saving
 * signs out every other device; this one stays signed in (the server issues it a new session).
 */
export function ChangePasswordForm({ me }: { me: MeResponse }) {
  const [changePassword] = useChangePasswordMutation();
  const [isRevealed, setIsRevealed] = useState(false);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordFormSchema(me)),
    defaultValues: EMPTY,
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = form;
  useNoAngleBrackets(form, "password");
  const [password, confirmPassword] = useWatch({ control, name: ["password", "confirmPassword"] });

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword(values).unwrap();
      reset(EMPTY);
      toast({ type: "success", message: "Password updated. Your other devices are signed out." });
    } catch (error) {
      // Field problems (wrong current password, a common one) go under the field; anything else
      // has been shown as a toast by the base query.
      applyApiError(error, FIELDS, setError);
    }
  };

  const type = isRevealed ? "text" : "password";
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FormFieldset disabled={isSubmitting} className="contents">
        <FormPasswordInput
          control={control}
          name="currentPassword"
          label="Current password"
          autoComplete="current-password"
          isRevealed={isRevealed}
          onRevealedChange={setIsRevealed}
          toggleLabel={{ show: "Show passwords", hide: "Hide passwords" }}
        />
        <div>
          <FormInput control={control} name="password" label="New password" type={type} autoComplete="new-password" />
          <PasswordStrengthMeter password={password} who={me} />
        </div>
        <FormInput
          control={control}
          name="confirmPassword"
          label="Confirm new password"
          type={type}
          autoComplete="new-password"
        />
        <PasswordChecks checks={getPasswordChecks(password, confirmPassword)} />
        <div className="flex justify-end">
          <Button text="Update password" loadingText="Updating…" type="submit" isLoading={isSubmitting} />
        </div>
      </FormFieldset>
    </form>
  );
}
