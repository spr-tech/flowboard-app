"use client";

import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { CodeInput } from "@/components/ui/codeInput/codeInput";
import {
  VERIFICATION_CODE_LENGTH,
  verifyCodeSchema,
  type VerifyCodeValues,
} from "@/models/validations/emailVerificationValidation";
import { useVerifyEmailCodeMutation } from "@/services/authService";
import { isAppError } from "@/utilities/helpers/applyApiError";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { cn } from "@/utilities/helpers/cn";

type VerifyCodeFormProps = {
  /** The code was right: the Me cache already says verified. */
  onVerified: () => void;
};

/**
 * The six boxes. Submits by itself when the sixth digit goes in (or with the button). A wrong code
 * clears the boxes and says how many tries are left; an expired code, or too many tries, points to
 * Resend. To start over after a new code is sent, the page gives this form a new `key`.
 */
export function VerifyCodeForm({ onVerified }: VerifyCodeFormProps) {
  const id = useId();
  const [verifyCode] = useVerifyEmailCodeMutation();
  // A new key empties the boxes after a wrong code, ready for the next try.
  const [boxesKey, setBoxesKey] = useState(0);
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VerifyCodeValues>({ resolver: zodResolver(verifyCodeSchema), defaultValues: { code: "" } });

  const onSubmit = async ({ code }: VerifyCodeValues) => {
    try {
      await verifyCode({ code }).unwrap();
      onVerified();
    } catch (error) {
      setBoxesKey((key) => key + 1);
      setValue("code", "");
      setError("code", { message: isAppError(error) ? error.message : NETWORK_ERROR_MESSAGE });
    }
  };
  const submit = handleSubmit(onSubmit);

  const labelId = `${id}-label`;
  const messageId = `${id}-message`;
  const message = errors.code?.message;
  const isComplete = useWatch({ control, name: "code" }).length === VERIFICATION_CODE_LENGTH;

  return (
    <form onSubmit={submit} noValidate>
      <FormFieldset disabled={isSubmitting} className="contents">
        <p id={labelId} className="mb-2.5 text-sm font-semibold text-fg-primary">
          Your {VERIFICATION_CODE_LENGTH}-digit code
        </p>
        <CodeInput
          key={boxesKey}
          length={VERIFICATION_CODE_LENGTH}
          labelledBy={labelId}
          describedBy={messageId}
          isInvalid={Boolean(message)}
          isDisabled={isSubmitting}
          autoFocus
          onChange={(code) => setValue("code", code)}
          onComplete={(code) => {
            setValue("code", code);
            void submit();
          }}
        />
        <p
          id={messageId}
          role={message ? "alert" : "status"}
          className={cn("mt-2.5 min-h-5 text-sm", message ? "font-medium text-danger" : "text-fg-secondary")}
        >
          {message ?? (isSubmitting ? "Checking your code…" : "")}
        </p>
        <p className="mt-1 text-sm text-fg-secondary">Can&apos;t find it? Check your spam folder.</p>

        <Button
          text="Confirm email"
          loadingText="Checking…"
          type="submit"
          variant="inverse"
          size="xl"
          className="mt-6 w-full"
          isLoading={isSubmitting}
          disabled={!isComplete}
        />
      </FormFieldset>
    </form>
  );
}
