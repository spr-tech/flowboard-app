"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { Input, type InputProps } from "./input";

export type PasswordInputProps = Omit<InputProps, "type" | "endAdornment"> & {
  /**
   * Pass both to control visibility from outside, for example so one toggle reveals
   * "Password" and "Confirm password" together. Leave both out and the field manages itself.
   */
  isRevealed?: boolean;
  onRevealedChange?: (isRevealed: boolean) => void;
  /** Read by screen readers on the toggle; plural when it reveals more than one field. */
  toggleLabel?: { show: string; hide: string };
};

export function PasswordInput({
  isRevealed: isRevealedProp,
  onRevealedChange,
  toggleLabel = { show: "Show password", hide: "Hide password" },
  ...rest
}: PasswordInputProps) {
  const [isRevealedLocal, setIsRevealedLocal] = useState(false);
  const isRevealed = isRevealedProp ?? isRevealedLocal;

  const handleToggle = () => {
    const next = !isRevealed;
    setIsRevealedLocal(next);
    onRevealedChange?.(next);
  };

  return (
    <Input
      {...rest}
      type={isRevealed ? "text" : "password"}
      endAdornment={
        <Button
          variant="ghost"
          aria-label={isRevealed ? toggleLabel.hide : toggleLabel.show}
          aria-pressed={isRevealed}
          startIcon={isRevealed ? <EyeOff /> : <Eye />}
          onClick={handleToggle}
        />
      }
    />
  );
}
