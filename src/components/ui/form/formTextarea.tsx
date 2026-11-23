"use client";

import type { FieldValues } from "react-hook-form";

import { Textarea, type TextareaProps } from "@/components/ui/input/textarea";
import { useFormField, type ControlledKeys, type FormFieldProps } from "./useFormField";

export type FormTextareaProps<TValues extends FieldValues> = Omit<TextareaProps, ControlledKeys> &
  FormFieldProps<TValues>;

/** Textarea bound to React Hook Form. Usage: <FormTextarea control={form.control} name="description" /> */
export function FormTextarea<TValues extends FieldValues>({ control, name, ...rest }: FormTextareaProps<TValues>) {
  const field = useFormField({ control, name });
  return <Textarea {...rest} {...field} />;
}
