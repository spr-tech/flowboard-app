// The auth API calls behind the sign-up, forgot-password and reset-password screens
// (docs/plan/04-api.md, "Auth"). Signing in and out go through Auth.js, not here.
//
// Every endpoint sets extraOptions: { toast: false }. These screens show every failure inline
// (under a field or above the button), so the base query's toast would say it twice.
import type {
  ForgotPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyResetTokenRequest,
} from "@/models/requests/authRequests";
import type {
  ForgotPasswordResponse,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyResetTokenResponse,
} from "@/models/responses/authResponses";
import { baseApi } from "@/configs/serviceConfig";

const controller = "auth";
const inlineErrorsOnly = { toast: false };

export const authService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Mutations: each one changes something on the server (an account, an email sent, a password).
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: `/${controller}/register`, method: "POST", body }),
      extraOptions: inlineErrorsOnly,
    }),
    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (body) => ({ url: `/${controller}/forgot-password`, method: "POST", body }),
      extraOptions: inlineErrorsOnly,
    }),
    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (body) => ({ url: `/${controller}/reset-password`, method: "POST", body }),
      extraOptions: inlineErrorsOnly,
    }),

    // A query, though it's a POST: it only reads, and the reset page needs it as soon as it
    // opens, so it runs by itself and gives isLoading / isError for free.
    verifyResetToken: builder.query<VerifyResetTokenResponse, VerifyResetTokenRequest>({
      query: (body) => ({ url: `/${controller}/reset-password/verify`, method: "POST", body }),
      // Uncached: a link's state changes once it's used, so a cached "valid" must never be
      // reused. 0 drops the result as soon as the reset page unmounts.
      keepUnusedDataFor: 0,
      extraOptions: inlineErrorsOnly,
    }),
  }),
});

export const { useRegisterMutation, useForgotPasswordMutation, useResetPasswordMutation } = authService;

/**
 * Checks a reset link without using it. Always asks the server when the page opens
 * (refetchOnMountOrArgChange), and not on tab focus, so the screen doesn't change under
 * someone who is typing a new password.
 */
export function useResetTokenState(token: string) {
  return authService.useVerifyResetTokenQuery({ token }, { refetchOnMountOrArgChange: true, refetchOnFocus: false });
}
