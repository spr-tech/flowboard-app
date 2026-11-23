// @vitest-environment node
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { authConfig } from "./auth.config";

const session: Session = { user: { id: "u1", email: "ada@example.com" }, expires: "2099-01-01T00:00:00Z" };

/** What middleware decides for a path: true (let through), false (to /login) or a redirect Response. */
function decide(path: string, isSignedIn: boolean) {
  return authConfig.callbacks.authorized({
    auth: isSignedIn ? session : null,
    request: new NextRequest(`https://flowboard.test${path}`),
  });
}

describe("route protection", () => {
  it.each(["/dashboard", "/projects", "/projects/abc", "/projects/abc/settings", "/settings"])(
    "sends signed-out visitors from %s to sign in",
    (path) => {
      expect(decide(path, false)).toBe(false);
    }
  );

  it.each(["/dashboard", "/projects/abc", "/settings"])("lets signed-in users into %s", (path) => {
    expect(decide(path, true)).toBe(true);
  });

  it.each(["/login", "/register", "/forgot-password"])("sends signed-in users from %s to the dashboard", (path) => {
    const decision = decide(path, true);

    expect(decision).toBeInstanceOf(Response);
    expect((decision as Response).headers.get("location")).toBe("https://flowboard.test/dashboard");
  });

  it.each(["/login", "/register", "/forgot-password", "/reset-password/abc", "/"])(
    "lets signed-out visitors open %s",
    (path) => {
      expect(decide(path, false)).toBe(true);
    }
  );

  it("keeps the reset page open to signed-in users too", () => {
    expect(decide("/reset-password/abc", true)).toBe(true);
  });

  it("sends signed-out visitors from /verify-email to sign in (Auth.js adds the callbackUrl back to it)", () => {
    expect(decide("/verify-email", false)).toBe(false);
    expect(decide("/verify-email", true)).toBe(true);
  });

  it("keeps the email's confirm link open to everyone: it works on any device", () => {
    expect(decide("/verify-email/link/abc", false)).toBe(true);
    expect(decide("/verify-email/link/abc", true)).toBe(true);
  });

  it("doesn't treat look-alike paths as protected", () => {
    expect(decide("/dashboards", false)).toBe(true);
    expect(decide("/settings-help", false)).toBe(true);
  });
});
