// Helpers for route-handler tests: a signed-in (or signed-out) session and request builders.
// The test file must first call: vi.mock("@/auth", () => ({ auth: vi.fn() }));
import type { Session } from "next-auth";
import type { Mock } from "vitest";

import { auth } from "@/auth";

export function signInAs(userId: string | null) {
  // auth() is overloaded (it can also be middleware); here it's only ever "read the session".
  const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;
  mockAuth.mockResolvedValue(
    userId ? { user: { id: userId, email: `${userId}@example.com` }, expires: "2099-01-01T00:00:00Z" } : null
  );
}

/** Next passes route params as a Promise. */
export function segment(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

export function jsonRequest(path: string, method: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}
