"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { Input as InputPrimitive } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/utilities/helpers/cn";

// ComponentProps (not InputHTMLAttributes) includes `ref`, which React Hook Form needs to focus a field with an error.
export type InputProps = ComponentProps<"input"> & {
  label?: string;
  helperText?: string;
  /** Shown instead of the helper text, and marks the field invalid for screen readers. */
  error?: string;
  /** Shown at the right end of the label row, such as a "Forgot password?" link. */
  labelEnd?: ReactNode;
  /** Sits inside the field at its right edge, such as a show-password button. */
  endAdornment?: ReactNode;
};

/** A labelled text field that works on its own. For React Hook Form, use FormInput. */
export function Input({
  label,
  helperText,
  error,
  labelEnd,
  endAdornment,
  required,
  id,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? helperText;

  return (
    <div className="flex flex-col gap-2">
      {(label || labelEnd) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <Label htmlFor={inputId} className="font-semibold text-fg-primary">
              {label}
              {required && (
                <span className="text-danger" aria-hidden>
                  *
                </span>
              )}
            </Label>
          )}
          {labelEnd}
        </div>
      )}
      <div className="relative">
        <InputPrimitive
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "h-13 rounded-input border-[1.5px] border-line-strong bg-surface-card px-4 text-[15px] text-fg-primary placeholder:text-fg-muted md:text-[15px]",
            "focus-visible:border-line-focus focus-visible:ring-4 focus-visible:ring-focus",
            endAdornment && "pr-14",
            className
          )}
          {...rest}
        />
        {endAdornment && <div className="absolute top-1 right-1">{endAdornment}</div>}
      </div>
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger" : "text-fg-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
