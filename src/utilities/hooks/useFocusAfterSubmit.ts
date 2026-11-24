"use client";

import { useEffect, useRef } from "react";
import type { FieldValues, Path, UseFormSetFocus } from "react-hook-form";

/**
 * Focus a field once the form unlocks. Our forms disable their fields while they submit
 * (FormFieldset), and a disabled field can't take focus, so calling setFocus mid-submit does
 * nothing. Used to put the cursor back in a cleared password after a failed sign-in.
 */
export function useFocusAfterSubmit<TValues extends FieldValues>(
  setFocus: UseFormSetFocus<TValues>,
  isLocked: boolean
) {
  const requested = useRef<Path<TValues> | null>(null);

  useEffect(() => {
    if (isLocked || !requested.current) return;
    const name = requested.current;
    requested.current = null;
    setFocus(name);
  }, [isLocked, setFocus]);

  return (name: Path<TValues>) => {
    requested.current = name;
  };
}
