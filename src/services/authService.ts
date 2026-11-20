// Auth API calls for the sign-up, forgot-password and reset-password forms.
// Temporary: a small typed fetch helper until RTK Query arrives in milestone 4, which turns these
// into mutations on the one base API. Forms show these errors inline, never as toasts.
import type {
  ForgotPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyResetTokenRequest,
} from "@/models/requests/authRequests";
import type { ApiErrorBody } from "@/models/responses/apiError";
import type {
  ForgotPasswordResponse,
  RegisterResponse,
  ResetPasswordResponse,
  VerifyResetTokenResponse,
} from "@/models/responses/authResponses";

/** The server answered with our error shape. `code` is what screens branch on. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Shown when the request never got an answer we understand (offline, server down). */
export const NETWORK_ERROR_MESSAGE = "We couldn't reach Flowboard. Check your connection and try again.";

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "object";
}

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, "NETWORK_ERROR", NETWORK_ERROR_MESSAGE);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiErrorBody(data)) {
      throw new ApiRequestError(response.status, data.error.code, data.error.message, data.error.fields);
    }
    throw new ApiRequestError(response.status, "UNKNOWN_ERROR", NETWORK_ERROR_MESSAGE);
  }
  return data as TResponse;
}

export const authService = {
  register: (body: RegisterRequest) => postJson<RegisterResponse>("/api/auth/register", body),
  forgotPassword: (body: ForgotPasswordRequest) => postJson<ForgotPasswordResponse>("/api/auth/forgot-password", body),
  verifyResetToken: (body: VerifyResetTokenRequest) =>
    postJson<VerifyResetTokenResponse>("/api/auth/reset-password/verify", body),
  resetPassword: (body: ResetPasswordRequest) => postJson<ResetPasswordResponse>("/api/auth/reset-password", body),
};
