import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { createBaseQuery, type AppExtraOptions } from "./baseQuery";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const fetchFn = vi.fn<typeof fetch>();
const leave = vi.fn<(url: string) => void>();

// What RTK Query passes a base query; fetchBaseQuery only reads these fields.
const api = {
  signal: new AbortController().signal,
  abort: vi.fn(),
  dispatch: vi.fn(),
  getState: () => ({}),
  extra: undefined,
  endpoint: "getMe",
  type: "query",
} as BaseQueryApi;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** A fresh base query each time, so the "already leaving" flag never carries over. */
function send(extraOptions: AppExtraOptions = {}) {
  return createBaseQuery({ baseUrl: "http://localhost/api", fetchFn }, leave)("/me", api, extraOptions);
}

beforeEach(() => {
  fetchFn.mockReset();
  window.history.replaceState(null, "", "/projects/p1?task=t1");
});

describe("baseQuery", () => {
  it("returns the data on success, with no toast", async () => {
    fetchFn.mockResolvedValue(json(200, { id: "u1", name: "Ada" }));

    const result = await send();

    expect(result).toMatchObject({ data: { id: "u1", name: "Ada" } });
    expect(result.error).toBeUndefined();
    expect(toast).not.toHaveBeenCalled();
    expect(fetchFn.mock.calls[0][0]).toMatchObject({ url: "http://localhost/api/me", method: "GET" });
  });

  it("leaves field errors to the form: normalised, and no toast", async () => {
    const body = {
      error: { code: "VALIDATION_FAILED", message: "Some fields need fixing.", fields: { name: "Too short" } },
    };
    fetchFn.mockResolvedValue(json(400, body));

    const result = await send();

    expect(result.error).toEqual({ status: 400, ...body.error });
    expect(toast).not.toHaveBeenCalled();
  });

  it("toasts the server's own message for other errors, once per code", async () => {
    fetchFn.mockResolvedValue(
      json(404, { error: { code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." } })
    );

    const result = await send();

    expect(result.error).toEqual({ status: 404, code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." });
    expect(toast).toHaveBeenCalledWith({
      type: "error",
      message: "We couldn't find that project.",
      id: "error:PROJECT_NOT_FOUND",
    });
  });

  it("doesn't toast when the endpoint opts out", async () => {
    fetchFn.mockResolvedValue(
      json(409, { error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } })
    );

    const result = await send({ toast: false });

    expect(result.error).toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
    expect(toast).not.toHaveBeenCalled();
  });

  it("on 401, leaves once through /auth/session-ended with the current page, and doesn't toast", async () => {
    fetchFn.mockImplementation(async () =>
      json(401, { error: { code: "UNAUTHENTICATED", message: "Your session has ended." } })
    );
    const baseQuery = createBaseQuery({ baseUrl: "http://localhost/api", fetchFn }, leave);

    const results = await Promise.all([
      baseQuery("/me", api, {}),
      baseQuery("/projects", api, {}),
      baseQuery("/me", api, {}),
    ]);

    expect(results.every((result) => result.error?.status === 401)).toBe(true);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledWith("/auth/session-ended?callbackUrl=%2Fprojects%2Fp1%3Ftask%3Dt1");
    expect(toast).not.toHaveBeenCalled();
  });

  it("on EMAIL_NOT_VERIFIED, goes to the code page with the current page, and doesn't toast", async () => {
    fetchFn.mockResolvedValue(
      json(403, { error: { code: "EMAIL_NOT_VERIFIED", message: "Confirm your email first." } })
    );

    const result = await send();

    expect(result.error?.code).toBe("EMAIL_NOT_VERIFIED");
    expect(leave).toHaveBeenCalledWith("/verify-email?callbackUrl=%2Fprojects%2Fp1%3Ftask%3Dt1");
    expect(toast).not.toHaveBeenCalled();
  });

  it("turns a network failure into NETWORK_ERROR with a friendly message, and toasts it", async () => {
    fetchFn.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await send();

    expect(result.error).toEqual({ status: "NETWORK", code: "NETWORK_ERROR", message: NETWORK_ERROR_MESSAGE });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ id: "error:NETWORK_ERROR" }));
  });

  it("turns an answer that isn't our shape (a hosting error page) into UNKNOWN_ERROR", async () => {
    fetchFn.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));

    const result = await send();

    expect(result.error).toMatchObject({ status: 502, code: "UNKNOWN_ERROR" });
  });
});
