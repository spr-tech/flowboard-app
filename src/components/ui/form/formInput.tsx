"use client";

import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Input, type InputProps } from "@/components/ui/input/input";

/** React Hook Form owns these, so callers can't pass them. */
type ControlledKeys = "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "error";

export type FormInputProps<TValues extends FieldValues> = Omit<InputProps, ControlledKeys> & {
  control: Control<TValues>;
  /** Checked against the form's values, so a typo in a field name is a type error. */
  name: Path<TValues>;
};

/**
 * Input bound to React Hook Form. Usage: <FormInput control={form.control} name="email" label="Email" />
 *
 * The error waits until the field has been left or the form submitted, so nobody is told
 * "Email is required" while they are still typing their first letter.
 */
export function FormInput<TValues extends FieldValues>({
  control,
  name,
  ...rest
}: FormInputProps<TValues>) {
  // Destructured on purpose: the hooks lint rule treats an object holding a `ref` as a ref itself,
  // and would flag reading `field.value` during render.
  const {
    field: { ref, value, onChange, onBlur },
    fieldState,
    formState,
  } = useController({ control, name });
  const shouldShowError = fieldState.isTouched || formState.isSubmitted;

  return (
    <Input
      {...rest}
      name={name}
      ref={ref}
      value={value ?? ""}
      onChange={onChange}
      onBlur={onBlur}
      error={shouldShowError ? fieldState.error?.message : undefined}
    />
  );
}
