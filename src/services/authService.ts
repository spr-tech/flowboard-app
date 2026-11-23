// The auth API calls behind the sign-up, forgot-password and reset-password screens
// (docs/plan/04-api.md, "Auth"). Signing in and out go through Auth.js, not here.
//
// Most endpoints set extraOptions: { toast: false }: their screens show every failure inline
// (under a field or above the button), so the base query's toast would say it twice. Sending a
// verification code is the exception: the banner's and the page's Resend both rely on the toast.
import type {
  ForgotPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyResetTokenRequest,
} from "@/models/requests/authRequests";
import type { VerificationStatusResponse, VerifyLinkResponse } from "@/models/responses/emailVerificationResponses";
import type { MeResponse } from "@/models/responses/meResponses";
import type { VerifyCodeValues, VerifyLinkValues } from "@/models/validations/emailVerificationValidation";
import type {
  ForgotPasswordResponse,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyResetTokenResponse,
} from "@/models/responses/authResponses";
import { baseApi } from "@/configs/serviceConfig";
import { accountService } from "@/services/accountService";
import { ApiTag } from "@/utilities/enums/apiTags";

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

    // Email verification (docs/plan/04-api.md, "Email verification").
    getVerificationStatus: builder.query<VerificationStatusResponse, void>({
      query: () => `/${controller}/verify-email/status`,
      providesTags: [ApiTag.Verification],
    }),
    /** Errors (the one-minute wait, the hourly limit) are toasts, and the status reloads either way. */
    sendVerificationCode: builder.mutation<VerificationStatusResponse, void>({
      query: () => ({ url: `/${controller}/verify-email/send`, method: "POST" }),
      onQueryStarted: async (_args, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(authService.util.upsertQueryData("getVerificationStatus", undefined, data));
        } catch {
          // The toast says why; the invalidation below reloads the cooldown.
        }
      },
      invalidatesTags: (result) => (result ? [] : [ApiTag.Verification]),
    }),
    /** The answer is the signed-in user, now verified: straight into the Me cache. */
    verifyEmailCode: builder.mutation<MeResponse, VerifyCodeValues>({
      query: (body) => ({ url: `/${controller}/verify-email/code`, method: "POST", body }),
      extraOptions: inlineErrorsOnly,
      onQueryStarted: async (_args, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(accountService.util.upsertQueryData("getMe", undefined, data));
        } catch {
          // The form shows why.
        }
      },
      invalidatesTags: (result) => (result ? [ApiTag.Verification] : []),
    }),
    /** Public: the link page may be opened signed out, so Me is refetched only if it's cached. */
    verifyEmailLink: builder.mutation<VerifyLinkResponse, VerifyLinkValues>({
      query: (body) => ({ url: `/${controller}/verify-email/link`, method: "POST", body }),
      extraOptions: inlineErrorsOnly,
      invalidatesTags: (result) => (result ? [ApiTag.Me, ApiTag.Verification] : []),
    }),
  }),
});

export const {
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSendVerificationCodeMutation,
  useVerifyEmailCodeMutation,
  useVerifyEmailLinkMutation,
} = authService;

/** /verify-email's status. Fresh each time the page opens, since the cooldown moves on. */
export function useVerificationStatus() {
  return authService.useGetVerificationStatusQuery(undefined, { refetchOnMountOrArgChange: true });
}

/**
 * Checks a reset link without using it. Always asks the server when the page opens
 * (refetchOnMountOrArgChange), and not on tab focus, so the screen doesn't change under
 * someone who is typing a new password.
 */
export function useResetTokenState(token: string) {
  return authService.useVerifyResetTokenQuery({ token }, { refetchOnMountOrArgChange: true, refetchOnFocus: false });
}
