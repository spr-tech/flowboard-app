// The base query wrapper: every RTK Query request in the app goes through this one function.
// A "base query" is what RTK Query calls to actually send a request. fetchBaseQuery does the
// fetch; this wrapper decides, in one place, what a failed request means for the user:
//   1. normalise every kind of failure into one AppError shape,
//   2. 401 → leave through /auth/session-ended (clears the dead cookie, then /login),
//   3. otherwise show one toast with the server's message, unless the form shows it
//      (errors with `fields`) or the endpoint opted out with extraOptions: { toast: false }.
// That's why components never catch-and-toast: the reason is already on screen.
import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryArgs } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { toast } from "@/components/ui/toast/toast";
import type { AppError } from "@/models/responses/apiError";
import { NETWORK_ERROR_MESSAGE, UNKNOWN_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";

/** Per-endpoint options for this wrapper, passed as `extraOptions` on the endpoint. */
export type AppExtraOptions = {
  /** false: never toast this endpoint's errors (its screen shows them itself). */
  toast?: boolean;
};

export type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, AppError, AppExtraOptions>;

function isErrorBody(data: unknown): data is { error: { code: string; message: string; fields?: Record<string, string> } } {
  if (typeof data !== "object" || data === null || !("error" in data)) return false;
  const error = data.error;
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

/** Turns each of fetchBaseQuery's error shapes into our one AppError. */
export function toAppError(error: FetchBaseQueryError): AppError {
  if (typeof error.status === "number") {
    if (isErrorBody(error.data)) {
      const { code, message, fields } = error.data.error;
      return { status: error.status, code, message, ...(fields ? { fields } : {}) };
    }
    return { status: error.status, code: "UNKNOWN_ERROR", message: UNKNOWN_ERROR_MESSAGE };
  }
  if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
    return { status: "NETWORK", code: "NETWORK_ERROR", message: NETWORK_ERROR_MESSAGE };
  }
  // PARSING_ERROR (an answer that isn't JSON, e.g. a hosting error page) or CUSTOM_ERROR.
  const status = "originalStatus" in error ? error.originalStatus : "NETWORK";
  return { status, code: "UNKNOWN_ERROR", message: UNKNOWN_ERROR_MESSAGE };
}

/** A full page load to `url`. Swappable only so tests can see where a 401 goes. */
function leaveForPage(url: string) {
  window.location.assign(url);
}

/**
 * Builds the base query. serviceConfig.ts calls it with baseUrl "/api"; tests call it with an
 * absolute URL, a mocked fetch and their own `leave`.
 */
export function createBaseQuery(options: FetchBaseQueryArgs, leave: (url: string) => void = leaveForPage): AppBaseQuery {
  const rawBaseQuery = fetchBaseQuery(options);
  // Five queries can fail with 401 at once; the first one navigates, the rest do nothing.
  let isLeaving = false;

  return async (args, api, extraOptions = {}) => {
    const result = await rawBaseQuery(args, api, {});
    if (!result.error) return { data: result.data, meta: result.meta };

    const error = toAppError(result.error);

    if (error.status === 401) {
      // A full page load, not a client navigation: it also empties the RTK Query cache, so no
      // data from the ended session stays on screen. /auth/session-ended clears the cookie
      // (or middleware would bounce /login back to /dashboard) and sends us to /login.
      if (!isLeaving && typeof window !== "undefined") {
        isLeaving = true;
        const here = `${window.location.pathname}${window.location.search}`;
        leave(`/auth/session-ended?callbackUrl=${encodeURIComponent(here)}`);
      }
    } else if (extraOptions.toast !== false && !error.fields) {
      // Same id for the same code: three failing requests show one toast, not three.
      toast({ type: "error", message: error.message, id: `error:${error.code}` });
    }

    return { error, meta: result.meta };
  };
}
