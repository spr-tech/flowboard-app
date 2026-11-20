import { Check } from "lucide-react";

import { PASSWORD_MIN_LENGTH } from "@/models/validations/authValidation";
import { cn } from "@/utilities/helpers/cn";

export type PasswordCheck = { label: string; isMet: boolean };

/** The live checks under a new-password field (sign-up and reset), worked out from the typed values. */
export function getPasswordChecks(password: string, confirmPassword: string): PasswordCheck[] {
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, isMet: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Passwords match", isMet: password.length > 0 && password === confirmPassword },
  ];
}

/** Chips that turn green as the password meets each rule. Announced politely as they change. */
export function PasswordChecks({ checks }: { checks: PasswordCheck[] }) {
  return (
    <ul aria-live="polite" className="mt-3.5 flex flex-wrap gap-2">
      {checks.map((check) => (
        <li
          key={check.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]",
            check.isMet
              ? "bg-status-done font-semibold text-status-done-fg"
              : "bg-surface-sunken font-medium text-fg-secondary",
          )}
        >
          {check.isMet ? (
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          ) : (
            <span aria-hidden className="size-2 rounded-full border-[1.5px] border-fg-muted" />
          )}
          {check.label}
          <span className="sr-only">{check.isMet ? "(done)" : "(not yet)"}</span>
        </li>
      ))}
    </ul>
  );
}
