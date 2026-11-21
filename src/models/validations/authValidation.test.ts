import { describe, expect, it } from "vitest";

import { loginSchema, PASSWORD_MIN_LENGTH, registerSchema } from "./authValidation";

const validRegistration = {
  name: "Ada Okafor",
  email: "ada@example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

/** The messages Zod reported, keyed by field, for readable assertions. */
function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));
}

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it(`rejects a password shorter than ${PASSWORD_MIN_LENGTH} characters`, () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = registerSchema.safeParse({ ...validRegistration, password: short, confirmPassword: short });

    expect(result.success).toBe(false);
    expect(fieldErrors(result).password).toBe(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  });

  it(`accepts a password of exactly ${PASSWORD_MIN_LENGTH} characters`, () => {
    const exact = "a".repeat(PASSWORD_MIN_LENGTH);
    expect(registerSchema.safeParse({ ...validRegistration, password: exact, confirmPassword: exact }).success).toBe(
      true
    );
  });

  it("rejects passwords that don't match, on the confirm field", () => {
    const result = registerSchema.safeParse({ ...validRegistration, confirmPassword: "something-else" });

    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual({ confirmPassword: "Passwords don't match" });
  });

  it("trims and lowercases the email", () => {
    const result = registerSchema.safeParse({ ...validRegistration, email: "  Ada.Okafor@Example.COM " });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ada.okafor@example.com");
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...validRegistration, email: "not-an-email" });
    expect(fieldErrors(result).email).toBe("Enter a valid email address");
  });

  it("rejects a name under 3 characters", () => {
    const result = registerSchema.safeParse({ ...validRegistration, name: "Al" });
    expect(fieldErrors(result).name).toBe("Name must be at least 3 characters");
  });
});

describe("loginSchema", () => {
  it("trims and lowercases the email", () => {
    const result = loginSchema.safeParse({ email: " DEMO@example.com", password: "x" });
    expect(result.data?.email).toBe("demo@example.com");
  });

  it("requires a password", () => {
    const result = loginSchema.safeParse({ email: "demo@example.com", password: "" });
    expect(fieldErrors(result)).toEqual({ password: "Password is required" });
  });
});
