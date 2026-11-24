// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { supportEmail } from "./supportEmail";

afterEach(() => vi.unstubAllEnvs());

describe("supportEmail", () => {
  it("is the sending address from EMAIL_USER", () => {
    vi.stubEnv("EMAIL_USER", " flowboard.team@gmail.com ");
    expect(supportEmail()).toBe("flowboard.team@gmail.com");
  });

  it("is null when EMAIL_USER isn't set", () => {
    vi.stubEnv("EMAIL_USER", "");
    expect(supportEmail()).toBeNull();
  });
});
