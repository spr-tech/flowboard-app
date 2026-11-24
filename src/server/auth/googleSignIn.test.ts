// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { isGoogleSignInEnabled } from "./googleSignIn";

afterEach(() => vi.unstubAllEnvs());

describe("isGoogleSignInEnabled", () => {
  it("is on when AUTH_GOOGLE_ID is set", () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "123.apps.googleusercontent.com");
    expect(isGoogleSignInEnabled()).toBe(true);
  });

  it("is off when it's missing or blank", () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    expect(isGoogleSignInEnabled()).toBe(false);
    vi.stubEnv("AUTH_GOOGLE_ID", "  ");
    expect(isGoogleSignInEnabled()).toBe(false);
  });
});
