import { z } from "zod";

/** Minimum password length; the sign-up form also shows it as a live check. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Emails are stored lowercase, so the schema trims and lowercases before checking the format.
 * The order matters: z.email().trim() checks first and would reject a pasted " ada@x.com ".
 */
const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

// Shared by the sign-up form and (from milestone 3) the API route, so both enforce the same rules.
export const registerSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: emailField,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
