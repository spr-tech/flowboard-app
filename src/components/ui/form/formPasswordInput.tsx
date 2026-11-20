"use client";

import type { FieldValues } from "react-hook-form";

import { PasswordInput, type PasswordInputProps } from "@/components/ui/input/passwordInput";
import { useFormField, type ControlledKeys, type FormFieldProps } from "./useFormField";

export type FormPasswordInputProps<TValues extends FieldValues> = Omit<PasswordInputProps, ControlledKeys> &
  FormFieldProps<TValues>;

/** PasswordInput bound to React Hook Form. */
export function FormPasswordInput<TValues extends FieldValues>({
  control,
  name,
  ...rest
}: FormPasswordInputProps<TValues>) {
  const field = useFormField({ control, name });
  return <PasswordInput {...rest} {...field} />;
}
