"use client";

import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

/** React Hook Form owns these, so form-bound fields don't accept them from callers. */
export type ControlledKeys = "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "error";

export type FormFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  /** Checked against the form's values, so a typo in a field name is a type error. */
  name: Path<TValues>;
};

/**
 * Turns a form field into the props our inputs take.
 *
 * The error waits until the field has been left or the form submitted, so nobody is told
 * "Email is required" while they are still typing their first letter.
 */
export function useFormField<TValues extends FieldValues>({ control, name }: FormFieldProps<TValues>) {
  // Destructured on purpose: the hooks lint rule treats an object holding a `ref` as a ref itself,
  // and would flag reading `field.value` during render.
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
    formState,
  } = useController({ control, name });
  const shouldShowError = fieldState.isTouched || formState.isSubmitted;

  return {
    name,
    ref,
    value: value ?? "",
    onChange,
    onBlur,
    error: shouldShowError ? fieldState.error?.message : undefined,
  };
}
