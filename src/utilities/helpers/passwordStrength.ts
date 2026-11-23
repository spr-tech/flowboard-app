// The password strength meter's score (sign-up, reset and change password). A small, pure guide,
// worked out in the browser: no library, no server, and it never blocks submitting. The rules
// that do block (length, a special character, no < or >, not your name or email) live in the
// shared schema; until they all pass, the meter says Weak.
import { newPasswordField, passwordMentionsYou } from "@/models/validations/authValidation";

export type PasswordStrength = "weak" | "fair" | "strong";

export const STRENGTH_LABELS: Record<PasswordStrength, string> = { weak: "Weak", fair: "Fair", strong: "Strong" };

type Who = { email?: string | null; name?: string | null };

/** Keyboard rows and runs people type without thinking, checked forwards and backwards. */
const RUNS = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** abc, 123, qwerty, cba, 321… (3 characters or more, case ignored). */
export function hasSimpleSequence(password: string): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i + 3 <= lower.length; i++) {
    const three = lower.slice(i, i + 3);
    const reversed = [...three].reverse().join("");
    if (RUNS.some((run) => run.includes(three) || run.includes(reversed))) return true;
  }
  return false;
}

/**
 * The same character 3 times in a row (aaa, 111, !!!), or 4 different characters or fewer
 * (abababab). Words reuse letters all the time, so a long passphrase isn't marked down for that.
 */
export function hasRepetition(password: string): boolean {
  if (/(.)\1\1/u.test(password)) return true;
  return password.length > 4 && new Set(password).size <= 4;
}

/** How many of lowercase, uppercase, digits and symbols (anything else, spaces included) appear. */
function characterKinds(password: string): number {
  return [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}]/u].filter((kind) => kind.test(password)).length;
}

/** Longer is stronger: 0 points under 12 characters, up to 4 from 20. */
function lengthPoints(length: number): number {
  if (length >= 20) return 4;
  if (length >= 16) return 2;
  if (length >= 12) return 1;
  return 0;
}

/**
 * Weak, Fair or Strong. Points for length and for mixing kinds of character; points off for
 * repeats and simple sequences. Weak whenever a rule fails, including containing your name or email.
 */
export function getPasswordStrength(password: string, who: Who = {}): PasswordStrength {
  if (!newPasswordField.safeParse(password).success || passwordMentionsYou(password, who)) return "weak";

  let points = lengthPoints(password.length) + (characterKinds(password) - 1);
  if (hasRepetition(password)) points -= 2;
  if (hasSimpleSequence(password)) points -= 1;

  if (points >= 5) return "strong";
  if (points >= 3) return "fair";
  return "weak";
}
