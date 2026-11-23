// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { PASSWORD_MIN_LENGTH } from "@/models/validations/authValidation";
import { signUp } from "@/server/auth/signUp.service";
import { ApiError } from "@/server/lib/errors";
import { POST } from "./route";

// route() imports Auth.js, which only loads inside Next; public routes never call it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/signUp.service", () => ({ signUp: vi.fn() }));

const valid = {
  name: "Ada Okafor",
  email: "Ada@Example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

function post(body: string) {
  // Next always passes a second argument with the (here empty) route params.
  return POST(new Request("http://localhost/api/auth/register", { method: "POST", body }), {
    params: Promise.resolve({}),
  });
}

describe("POST /api/auth/register", () => {
  it("creates the account with a lowercased email and answers 201 with the user", async () => {
    const created = { id: "u1", name: "Ada Okafor", email: "ada@example.com", needsEmailCode: true };
    vi.mocked(signUp).mockResolvedValue(created);

    const response = await post(JSON.stringify(valid));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(signUp).toHaveBeenCalledWith({
      name: "Ada Okafor",
      email: "ada@example.com",
      password: "correct-horse",
      inviteToken: undefined,
    });
  });

  it("passes the invite link's token along, so an invited sign-up skips the code", async () => {
    vi.mocked(signUp).mockResolvedValue({ id: "u1", name: "Ada", email: "ada@example.com", needsEmailCode: false });

    const response = await post(JSON.stringify({ ...valid, inviteToken: "tok" }));

    expect(response.status).toBe(201);
    expect((await response.json()).needsEmailCode).toBe(false);
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ inviteToken: "tok" }));
  });

  it("answers 409 in our error shape when the email is taken", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.")
    );

    const response = await post(JSON.stringify(valid));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
    });
  });

  it("validates on the server with the shared schema: 400 with per-field messages", async () => {
    const response = await post(JSON.stringify({ ...valid, password: "short", confirmPassword: "different" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.fields).toMatchObject({
      password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("answers 400 INVALID_JSON for a body that isn't JSON", async () => {
    const response = await post("not json");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
  });

  it("hides unexpected errors behind a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(signUp).mockRejectedValue(new Error("connection string with secrets"));

    const response = await post(JSON.stringify(valid));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("secrets");
  });
});
