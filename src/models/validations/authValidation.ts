// Auth schemas, shared by the forms and the API routes so both enforce exactly the same rules.
import { z } from "zod";

/**
 * Minimum password length; the new-password forms also show it as a live check. It applies when a
 * password is set or changed: existing accounts with shorter passwords still sign in.
 */
export const PASSWORD_MIN_LENGTH = 10;

/**
 * bcrypt only reads the first 72 bytes of a password, so a longer one would match any password
 * that shares those bytes. Counted in bytes, not characters: "é" is 2 bytes.
 */
export const PASSWORD_MAX_BYTES = 72;

/**
 * Emails are stored lowercase, so the schema trims and lowercases before checking the format.
 * The order matters: z.email().trim() checks first and would reject a pasted " ada@x.com ".
 */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254, "Email must be at most 254 characters"));

export const ANGLE_BRACKETS_MESSAGE = "Passwords can't contain < or >";
export const SPECIAL_CHARACTER_MESSAGE = "Add at least one special character, like ! or #";

/** "<" or ">" anywhere. The only characters a new password may not contain. */
export const hasAngleBracket = (password: string) => /[<>]/.test(password);

/**
 * Anything that isn't a letter or a digit (in any alphabet), spaces included. Angle brackets
 * don't count: they aren't allowed at all.
 */
export const hasSpecialCharacter = (password: string) => /[^\p{L}\p{N}<>]/u.test(password);

/**
 * The rules for a new password (sign-up, reset, change): length, one special character, and no
 * < or >. Every other character is allowed, spaces and symbols included. These apply only when a
 * password is set or changed: signing in only needs one to be typed, so older passwords keep
 * working. The common-password list is checked on the server only (src/server/auth/passwordRules.ts),
 * so the list never ships to browsers.
 */
export const newPasswordField = z
  .string()
  // First, so it's the message shown (forms show a field's first problem), whatever else is wrong.
  .refine((value) => !hasAngleBracket(value), { message: ANGLE_BRACKETS_MESSAGE })
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: `Password is too long: ${PASSWORD_MAX_BYTES} bytes at most (accented letters and emoji count as 2 to 4)`,
  })
  .refine(hasSpecialCharacter, { message: SPECIAL_CHARACTER_MESSAGE });

export const PERSONAL_INFO_MESSAGE = "Don't use your name or email in your password";

/** Name parts of 4+ characters: the email's name part (before any "+") and each word of the name. */
export function personalWords(who: { email?: string | null; name?: string | null }): string[] {
  const local = (who.email ?? "").toLowerCase().split("@")[0].split("+")[0];
  const words = (who.name ?? "").toLowerCase().split(/\s+/);
  return [local, ...words].filter((word) => word.length >= 4);
}

/** Does the password contain the email's name part or a word of the person's name? Case doesn't matter. */
export function passwordMentionsYou(password: string, who: { email?: string | null; name?: string | null }) {
  const lower = password.toLowerCase();
  return personalWords(who).some((word) => lower.includes(word));
}

const nameField = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(80, "Name must be at most 80 characters");

const passwordsMatch = {
  check: (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
  error: { message: "Passwords don't match", path: ["confirmPassword"] },
};

const registerFields = z.object({
  name: nameField,
  email: emailField,
  password: newPasswordField,
  confirmPassword: z.string(),
});

const notAboutYou = {
  check: (data: { password: string; email: string; name: string }) => !passwordMentionsYou(data.password, data),
  error: { message: PERSONAL_INFO_MESSAGE, path: ["password"] },
};

/** The sign-up form. */
export const registerSchema = registerFields
  .refine(passwordsMatch.check, passwordsMatch.error)
  .refine(notAboutYou.check, notAboutYou.error);

/**
 * POST /api/auth/register: the form, plus the invite link it came from, if any. A live invite for
 * this email means no code is sent (accepting the invite confirms the email).
 */
export const registerRequestSchema = registerFields
  .extend({ inviteToken: z.string().trim().min(1).max(200).optional() })
  .refine(passwordsMatch.check, passwordsMatch.error)
  .refine(notAboutYou.check, notAboutYou.error);

/** PATCH /api/me and the profile form. */
export const updateMeSchema = z.object({ name: nameField });
export type UpdateMeValues = z.infer<typeof updateMeSchema>;

/**
 * PATCH /api/me/password. The server also checks the name/email rule and the common list against
 * the account itself; the form adds the name/email rule with `changePasswordFormSchema`.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.error);
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** The change-password form, which knows who's signed in. */
export const changePasswordFormSchema = (who: { email?: string | null; name?: string | null }) =>
  changePasswordSchema.refine((data) => !passwordMentionsYou(data.password, who), {
    message: PERSONAL_INFO_MESSAGE,
    path: ["password"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/** The token from the reset link. 32 random bytes in base64url are 43 characters. */
const resetTokenField = z.string().trim().min(1, "The reset link is missing its code").max(200);

/** The reset form itself: the token comes from the URL, not from a field. */
export const resetPasswordFormSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.error);

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

/** POST /api/auth/reset-password. */
export const resetPasswordSchema = z
  .object({
    token: resetTokenField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.error);

/** POST /api/auth/reset-password/verify. */
export const verifyResetTokenSchema = z.object({
  token: resetTokenField,
});
