"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import { FormPasswordInput } from "@/components/ui/form/formPasswordInput";
import type { ResetTokenState } from "@/models/responses/authResponses";
import { resetPasswordFormSchema, type ResetPasswordFormValues } from "@/models/validations/authValidation";
import { useResetPasswordMutation } from "@/services/authService";
import { useNoAngleBrackets } from "@/utilities/hooks/useNoAngleBrackets";
import { getPasswordChecks, PasswordChecks } from "../passwordChecks";
import { PasswordStrengthMeter } from "../passwordStrengthMeter";
import { applyApiError, isAppError } from "@/utilities/helpers/applyApiError";

/** The server's error codes for a link that stopped working while the form was open. */
const TOKEN_ERROR_STATES: Record<string, Exclude<ResetTokenState, "valid">> = {
  TOKEN_INVALID: "invalid",
  TOKEN_USED: "used",
  TOKEN_EXPIRED: "expired",
};

type ResetPasswordFormProps = {
  token: string;
  onDone: () => void;
  /** The link turned out to be unusable on submit (e.g. used in another tab meanwhile). */
  onTokenRejected: (state: Exclude<ResetTokenState, "valid">) => void;
};

/** New password + confirm, with the same live checks as sign-up. */
export function ResetPasswordForm({ token, onDone, onTokenRejected }: ResetPasswordFormProps) {
  const [resetPassword] = useResetPasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form;
  useNoAngleBrackets(form, "password");

  const [password, confirmPassword] = useWatch({ control, name: ["password", "confirmPassword"] });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setFormError(null);
    try {
      await resetPassword({ ...values, token }).unwrap();
      onDone();
    } catch (error) {
      const rejectedState = isAppError(error) ? TOKEN_ERROR_STATES[error.code] : undefined;
      if (rejectedState) {
        onTokenRejected(rejectedState);
        return;
      }
      setFormError(applyApiError(error, ["password", "confirmPassword"], setError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormFieldset disabled={isSubmitting} className="contents">
        <div className="flex flex-col gap-4">
          <div>
            <FormPasswordInput
              control={control}
              name="password"
              label="New password"
              autoComplete="new-password"
              isRevealed={isPasswordRevealed}
              onRevealedChange={setIsPasswordRevealed}
              toggleLabel={{ show: "Show passwords", hide: "Hide passwords" }}
            />
            {/* The reset page doesn't know whose account it is; the server checks the name/email rule. */}
            <PasswordStrengthMeter password={password} />
          </div>
          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirm new password"
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
          text="Save new password"
          loadingText="Saving…"
          type="submit"
          size="xl"
          className="mt-6 w-full"
          isLoading={isSubmitting}
        />
      </FormFieldset>
    </form>
  );
}
