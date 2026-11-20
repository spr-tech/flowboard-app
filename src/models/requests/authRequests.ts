import type {
  ForgotPasswordFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
} from "@/models/validations/authValidation";

/** POST /api/auth/register: the sign-up form as typed, validated again on the server. */
export type RegisterRequest = RegisterFormValues;

/** POST /api/auth/forgot-password. */
export type ForgotPasswordRequest = ForgotPasswordFormValues;

/** POST /api/auth/reset-password/verify. */
export type VerifyResetTokenRequest = { token: string };

/** POST /api/auth/reset-password. */
export type ResetPasswordRequest = ResetPasswordFormValues & { token: string };
