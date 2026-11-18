"use client";

import type { FieldValues } from "react-hook-form";

import { Input, type InputProps } from "@/components/ui/input/input";
import { useFormField, type ControlledKeys, type FormFieldProps } from "./useFormField";

export type FormInputProps<TValues extends FieldValues> = Omit<InputProps, ControlledKeys> &
  FormFieldProps<TValues>;

/** Input bound to React Hook Form. Usage: <FormInput control={form.control} name="email" label="Email" /> */
export function FormInput<TValues extends FieldValues>({
  control,
  name,
  ...rest
}: FormInputProps<TValues>) {
  const field = useFormField({ control, name });
  return <Input {...rest} {...field} />;
}
