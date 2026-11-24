// @vitest-environment node
import { describe, expect, it } from "vitest";

import { verificationRedirect } from "./verificationGate";

describe("verificationRedirect", () => {
  it("lets a verified user through", () => {
    expect(verificationRedirect({ isEmailVerified: true }, "/projects/p1")).toBeNull();
  });

  it("sends an unverified user to the code page, coming back to the page they asked for", () => {
    expect(verificationRedirect({ isEmailVerified: false }, "/projects/p1?task=t1")).toBe(
      "/verify-email?callbackUrl=%2Fprojects%2Fp1%3Ftask%3Dt1"
    );
  });

  it("falls back to the dashboard when the path is missing or isn't one of ours", () => {
    expect(verificationRedirect({ isEmailVerified: false }, null)).toBe("/verify-email?callbackUrl=%2Fdashboard");
    expect(verificationRedirect({ isEmailVerified: false }, "//evil.example/x")).toBe(
      "/verify-email?callbackUrl=%2Fdashboard"
    );
  });
});
