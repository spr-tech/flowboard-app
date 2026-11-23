"use client";

import { useEffect } from "react";
import { useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

/** Errors of this type show under the field straight away, not only after it's left (useFormField). */
export const LIVE_ERROR_TYPE = "live";

type LiveFieldRuleOptions<TValues extends FieldValues> = {
  form: Pick<UseFormReturn<TValues>, "control" | "setError" | "clearErrors" | "getFieldState">;
  name: Path<TValues>;
  /** True when the typed value breaks the rule. */
  isBroken: (value: unknown) => boolean;
  message: string;
};

/**
 * Shows one rule's message as soon as the value breaks it (a "<" in a password, say), and takes
 * it away once fixed. The schema still checks the rule on submit; this only tells people sooner.
 */
export function useLiveFieldRule<TValues extends FieldValues>({
  form: { control, setError, clearErrors, getFieldState },
  name,
  isBroken,
  message,
}: LiveFieldRuleOptions<TValues>) {
  const value: unknown = useWatch({ control, name });
  const broken = isBroken(value);

  useEffect(() => {
    const current = getFieldState(name).error;
    if (broken) {
      if (current?.message !== message) setError(name, { type: LIVE_ERROR_TYPE, message });
    } else if (current?.type === LIVE_ERROR_TYPE) {
      clearErrors(name);
    }
  }, [broken, name, message, setError, clearErrors, getFieldState]);
}
