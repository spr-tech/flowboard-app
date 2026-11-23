import { describe, expect, it } from "vitest";

import {
  changePasswordFormSchema,
  changePasswordSchema,
  loginSchema,
  PASSWORD_MIN_LENGTH,
  passwordMentionsYou,
  registerSchema,
  updateMeSchema,
} from "./authValidation";

const validRegistration = {
  name: "Ada Okafor",
  email: "ada@example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

/** The messages Zod reported, keyed by field, for readable assertions. */
/** The first message for each field, as the API (zodFieldErrors) and the forms show them. */
function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const fields: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) fields[issue.path.join(".")] ??= issue.message;
  return fields;
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
    const exact = `${"a".repeat(PASSWORD_MIN_LENGTH - 1)}!`;
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

describe("new password rules", () => {
  const register = (password: string) =>
    registerSchema.safeParse({ ...validRegistration, password, confirmPassword: password });

  it("asks for 10 characters", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(fieldErrors(register("nine-char")).password).toBe("Password must be at least 10 characters");
    expect(register("ten-chars!").success).toBe(true);
  });

  it("allows any characters except < and >, symbols and spaces included", () => {
    expect(register("plum harbour ☕ & ok").success).toBe(true);
    expect(register("Ünïcödé-plüm-日本").success).toBe(true);
  });

  it("asks for one special character: anything that isn't a letter or a digit, spaces included", () => {
    expect(fieldErrors(register("plumharbour71")).password).toBe("Add at least one special character, like ! or #");
    for (const password of ["plumharbour!", "plum harbour", "plumharbour#7", "plumharbour_", "plumharbour☕"]) {
      expect(register(password).success).toBe(true);
    }
    // Letters and digits in any alphabet are still letters and digits.
    expect(register("日本語のパスワード東京").success).toBe(false);
  });

  it("refuses < and >, and says so first, whatever else is wrong", () => {
    expect(fieldErrors(register("plum<harbour>!")).password).toBe("Passwords can't contain < or >");
    expect(fieldErrors(register("a<b")).password).toBe("Passwords can't contain < or >");
    // They don't count as the special character either.
    expect(register("plumharbour<").success).toBe(false);
    expect(register("plumharbour>!").success).toBe(false);
  });

  it("caps a password at 72 bytes, counting accented letters and emoji as more than one", () => {
    expect(register(`${"x".repeat(71)}!`).success).toBe(true);
    expect(fieldErrors(register(`${"x".repeat(72)}!`)).password).toMatch(/^Password is too long: 72 bytes at most/);
    // 35 two-byte letters and two "!" are 72 bytes; one more letter is 74.
    expect(register(`${"é".repeat(35)}!!`).success).toBe(true);
    expect(register(`${"é".repeat(36)}!!`).success).toBe(false);
  });

  it("refuses the email's name part or a word of the name, when 4+ characters", () => {
    expect(fieldErrors(register("my okafor secret")).password).toBe("Don't use your name or email in your password");
    expect(passwordMentionsYou("theADAadventure", { email: "ada@x.dev", name: "Ada Li" })).toBe(false);
    expect(passwordMentionsYou("plum-sam.rivera-1", { email: "sam.rivera+work@x.dev" })).toBe(true);
  });
});

describe("account schemas", () => {
  it("renames with the same rules as sign-up", () => {
    expect(updateMeSchema.parse({ name: "  Ada Okafor " })).toEqual({ name: "Ada Okafor" });
    expect(fieldErrors(updateMeSchema.safeParse({ name: "Al" })).name).toBe("Name must be at least 3 characters");
  });

  it("changes a password: current one typed, new rules, matching confirmation", () => {
    const change = { currentPassword: "old", password: "plum-harbour-71", confirmPassword: "plum-harbour-71" };
    expect(changePasswordSchema.safeParse(change).success).toBe(true);
    expect(fieldErrors(changePasswordSchema.safeParse({ ...change, currentPassword: "" })).currentPassword).toBe(
      "Enter your current password"
    );
    expect(fieldErrors(changePasswordSchema.safeParse({ ...change, confirmPassword: "x" })).confirmPassword).toBe(
      "Passwords don't match"
    );
    const forAda = changePasswordFormSchema({ email: "ada@x.dev", name: "Ada Okafor" });
    expect(
      fieldErrors(forAda.safeParse({ ...change, password: "okafor-2026!", confirmPassword: "okafor-2026!" })).password
    ).toBe("Don't use your name or email in your password");
  });
});
