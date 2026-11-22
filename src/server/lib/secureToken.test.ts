// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createToken, hashToken } from "./secureToken";

describe("secureToken", () => {
  it("makes a 43-character URL-safe token and the SHA-256 hex of it", () => {
    const { token, tokenHash } = createToken();

    expect(token).toMatch(/^[\w-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("never repeats", () => {
    expect(createToken().token).not.toBe(createToken().token);
  });
});
