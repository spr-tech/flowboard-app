// Auth schemas, shared by the forms and the API routes so both enforce exactly the same rules.
import { z } from "zod";

/** Minimum password length; the sign-up and reset forms also show it as a live check. */
export const PASSWORD_MIN_LENGTH = 8;

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

/** The rules for a new password (sign-up and reset). Signing in only needs one to be typed. */
export const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    message: `Password must be at most ${PASSWORD_MAX_BYTES} characters`,
  });

const passwordsMatch = {
  check: (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
  error: { message: "Passwords don't match", path: ["confirmPassword"] },
};

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(80, "Name must be at most 80 characters"),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.error);

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
