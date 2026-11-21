import { describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { makeStore } from "@/stores/store";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { authService } from "./authService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const { register, forgotPassword, resetPassword, verifyResetToken } = authService.endpoints;

type Store = ReturnType<typeof makeStore>;
const password = { password: "pw-12345", confirmPassword: "pw-12345" };

describe("authService", () => {
  it.each<[string, string, (store: Store) => Promise<unknown>]>([
    [
      "register",
      "/api/auth/register",
      (store) => store.dispatch(register.initiate({ name: "Ada", email: "ada@example.com", ...password })),
    ],
    [
      "forgotPassword",
      "/api/auth/forgot-password",
      (store) => store.dispatch(forgotPassword.initiate({ email: "ada@example.com" })),
    ],
    [
      "resetPassword",
      "/api/auth/reset-password",
      (store) => store.dispatch(resetPassword.initiate({ token: "t", ...password })),
    ],
    [
      "verifyResetToken",
      "/api/auth/reset-password/verify",
      (store) => store.dispatch(verifyResetToken.initiate({ token: "t" })),
    ],
  ])("%s POSTs JSON to %s", async (_name, path, send) => {
    const fetchMock = mockFetch(() => jsonResponse(200, {}));
    const store = makeStore();

    await send(store);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).pathname).toBe(path);
    expect(request.method).toBe("POST");
  });

  it("throws our AppError from unwrap(), with code and fields, and never toasts", async () => {
    mockFetch(() =>
      jsonResponse(409, { error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } })
    );
    const store = makeStore();

    const call = store
      .dispatch(
        register.initiate({ name: "Ada", email: "ada@example.com", password: "pw-12345", confirmPassword: "pw-12345" })
      )
      .unwrap();

    await expect(call).rejects.toEqual({
      status: 409,
      code: "EMAIL_TAKEN",
      message: "An account with this email already exists.",
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it("doesn't toast a network failure either: the auth screens show it inline", async () => {
    mockFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const store = makeStore();

    await expect(store.dispatch(forgotPassword.initiate({ email: "ada@example.com" })).unwrap()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(toast).not.toHaveBeenCalled();
  });
});
