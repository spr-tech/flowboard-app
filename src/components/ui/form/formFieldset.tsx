"use client";

import { useEffect, useRef, type ComponentProps, type FocusEvent } from "react";

import { cn } from "@/utilities/helpers/cn";

/**
 * Wraps a form's fields so one `disabled` turns them all off while the form submits.
 * - The browser disables every input and button inside a disabled <fieldset>. React Hook Form
 *   keeps the values in its own state, so nothing typed is lost, unlike RHF's per-field
 *   `disabled` option, which leaves the field out of the submitted values.
 * - A disabled field loses focus. When the fieldset unlocks, focus goes to the first invalid field
 *   (unless it is already in a field), or, with no error, back to the field that had it if the lock
 *   took focus away (so quick add keeps the cursor).
 * - The browser's default fieldset border, padding and min-width are removed. Pass
 *   className="contents" to leave the form's own layout exactly as it was.
 */
export function FormFieldset({ disabled, className, onFocus, ...rest }: ComponentProps<"fieldset">) {
  const ref = useRef<HTMLFieldSetElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const wasDisabled = useRef(false);

  const handleFocus = (event: FocusEvent<HTMLFieldSetElement>) => {
    if (event.target instanceof HTMLElement) lastFocused.current = event.target;
    onFocus?.(event);
  };

  useEffect(() => {
    if (disabled) {
      wasDisabled.current = true;
      return;
    }
    if (!wasDisabled.current) return;
    wasDisabled.current = false;

    const fieldset = ref.current;
    const active = document.activeElement;
    // Already in one of the fields (React Hook Form may have focused the error itself): leave it.
    if (fieldset && active && fieldset.contains(active)) return;

    // An error wins over wherever focus is, including the submit button just pressed (which can
    // keep focus while disabled), as React Hook Form does when it focuses an error.
    const invalid = fieldset?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      invalid.focus();
      return;
    }
    // No error: only give focus back if the lock took it away.
    const focusWasLost = !active || active === document.body;
    if (focusWasLost && lastFocused.current?.isConnected) lastFocused.current.focus();
  }, [disabled]);

  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      onFocus={handleFocus}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      {...rest}
    />
  );
}
