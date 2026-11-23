import { cn } from "@/utilities/helpers/cn";
import { getPasswordStrength, STRENGTH_LABELS, type PasswordStrength } from "@/utilities/helpers/passwordStrength";

const LEVELS: Record<PasswordStrength, { filled: number; bar: string }> = {
  weak: { filled: 1, bar: "bg-danger" },
  fair: { filled: 2, bar: "bg-warning" },
  strong: { filled: 3, bar: "bg-success" },
};

type PasswordStrengthMeterProps = {
  password: string;
  /** Whose password: containing their name or email makes it Weak. */
  who?: { email?: string | null; name?: string | null };
};

/**
 * Under a new-password field: a 3-part bar and the word (Weak, Fair, Strong), so colour is never
 * the only signal. Announced politely as it changes. A guide only: it never blocks submitting.
 */
export function PasswordStrengthMeter({ password, who }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password, who);
  const level = LEVELS[strength];
  const isEmpty = password.length === 0;

  return (
    <div className="mt-2.5" data-strength={isEmpty ? undefined : strength}>
      <div aria-hidden className="flex gap-1.5">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              !isEmpty && segment < level.filled ? level.bar : "bg-line-subtle"
            )}
          />
        ))}
      </div>
      {/* Always in the page, so the first change is announced too; empty until something is typed. */}
      <p aria-live="polite" className="mt-1.5 min-h-5 text-[13px] text-fg-secondary">
        {!isEmpty && (
          <>
            Password strength: <span className="font-semibold text-fg-primary">{STRENGTH_LABELS[strength]}</span>
          </>
        )}
      </p>
    </div>
  );
}
