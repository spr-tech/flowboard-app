"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/models/validations/authValidation";
import { useForgotPasswordMutation } from "@/services/authService";
import { applyApiError } from "@/utilities/helpers/applyApiError";

type ForgotPasswordFormProps = {
  /** Called with the (lowercased) email once the request has gone through. */
  onSent: (email: string) => void;
};

/** Asks for a reset link. The server answers the same whether or not the email has an account. */
export function ForgotPasswordForm({ onSent }: ForgotPasswordFormProps) {
  const [requestResetLink] = useForgotPasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setFormError(null);
    try {
      await requestResetLink(values).unwrap();
      onSent(values.email);
    } catch (error) {
      setFormError(applyApiError(error, ["email"], setError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormFieldset disabled={isSubmitting} className="contents">
        <FormInput
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
        />

        {formError && (
          <p role="alert" className="mt-5 text-center text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <Button
          text="Send reset link"
          loadingText="Sending…"
          type="submit"
          size="xl"
          className="mt-7 w-full"
          isLoading={isSubmitting}
        />
      </FormFieldset>
    </form>
  );
}
