"use client";

import { useId, type ComponentProps } from "react";

import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/utilities/helpers/cn";

export type TextareaProps = ComponentProps<"textarea"> & {
  label?: string;
  helperText?: string;
  /** Shown instead of the helper text, and marks the field invalid for screen readers. */
  error?: string;
  /** With maxLength: "N / max" at the right end of the label row. */
  showCount?: boolean;
};

/** A labelled multi-line field that works on its own. For React Hook Form, use FormTextarea. */
export function Textarea({
  label,
  helperText,
  error,
  showCount,
  id,
  className,
  value,
  maxLength,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? helperText;
  const length = typeof value === "string" ? value.length : 0;

  return (
    <div className="flex flex-col gap-2">
      {(label || showCount) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <Label htmlFor={fieldId} className="font-semibold text-fg-primary">
              {label}
            </Label>
          )}
          {showCount && maxLength !== undefined && (
            <span className="text-xs text-fg-muted" aria-hidden>
              {length} / {maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        id={fieldId}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "rounded-input border-[1.5px] border-line-strong bg-surface-card px-4 py-3 text-[15px] leading-relaxed text-fg-primary placeholder:text-fg-muted",
          "focus-visible:border-line-focus focus-visible:ring-4 focus-visible:ring-focus focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-secondary aria-invalid:border-danger",
          className
        )}
        {...rest}
      />
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger" : "text-fg-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
