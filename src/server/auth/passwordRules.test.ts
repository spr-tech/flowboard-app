// @vitest-environment node
import { describe, expect, it } from "vitest";

import { COMMON_PASSWORDS } from "./commonPasswords";
import { COMMON_PASSWORD_MESSAGE, assertPasswordAllowed, isCommonPassword } from "./passwordRules";

const ada = { email: "ada.obi+work@team.dev", name: "Ada Okafor" };

describe("isCommonPassword", () => {
  it("knows the list's 10+ character entries, ignoring case", () => {
    expect(COMMON_PASSWORDS.size).toBeGreaterThan(40);
    expect(isCommonPassword("1234567890")).toBe(true);
    expect(isCommonPassword("BasketBall")).toBe(true);
    expect(isCommonPassword("plum-harbour-71")).toBe(false);
  });

  it("only holds lowercase entries of 10+ characters", () => {
    for (const entry of COMMON_PASSWORDS) {
      expect(entry).toBe(entry.toLowerCase());
      expect(entry.length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("assertPasswordAllowed", () => {
  it("refuses a common password, on the password field", () => {
    expect(() => assertPasswordAllowed("qwertyuiop", ada)).toThrow(
      expect.objectContaining({ status: 400, code: "VALIDATION_FAILED", fields: { password: COMMON_PASSWORD_MESSAGE } })
    );
  });

  it("refuses the email's name part or a word of the name (4+ characters), any case", () => {
    const refused = { fields: { password: "Don't use your name or email in your password" } };
    expect(() => assertPasswordAllowed("my-ADA.OBI-secret", ada)).toThrow(expect.objectContaining(refused));
    expect(() => assertPasswordAllowed("okafor rocks 2026", ada)).toThrow(expect.objectContaining(refused));
  });

  it("allows short name parts, and anything else, including spaces and symbols", () => {
    expect(() => assertPasswordAllowed("ada plum harbour", ada)).not.toThrow(); // "ada" is under 4
    expect(() => assertPasswordAllowed("café ☕ & 'quotes' \"too\"", ada)).not.toThrow();
  });

  it("puts the message on the field the form uses", () => {
    expect(() => assertPasswordAllowed("1234567890", ada, "newPassword")).toThrow(
      expect.objectContaining({ fields: { newPassword: COMMON_PASSWORD_MESSAGE } })
    );
  });
});
