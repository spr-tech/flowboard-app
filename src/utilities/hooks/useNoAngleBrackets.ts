"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { ANGLE_BRACKETS_MESSAGE, hasAngleBracket } from "@/models/validations/authValidation";
import { useLiveFieldRule } from "@/utilities/hooks/useLiveFieldRule";

/**
 * The new-password forms (sign-up, reset, change) call this for their new-password field:
 * "Passwords can't contain < or >" appears under it as soon as one is typed.
 */
export function useNoAngleBrackets<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, "control" | "setError" | "clearErrors" | "getFieldState">,
  name: Path<TValues>
) {
  useLiveFieldRule({
    form,
    name,
    isBroken: (value) => typeof value === "string" && hasAngleBracket(value),
    message: ANGLE_BRACKETS_MESSAGE,
  });
}
