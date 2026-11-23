// @vitest-environment node
import type { Session } from "next-auth";
import { describe, expect, it, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { getMe } from "@/server/account/account.service";
import { GET } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/account/account.service", () => ({ getMe: vi.fn() }));
const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

const me = {
  id: "u1",
  name: "Ada Okafor",
  email: "ada@example.com",
  image: null,
  hasPassword: true,
  emailVerified: true,
};

function get() {
  return GET(new Request("http://localhost/api/me"), { params: Promise.resolve({}) });
}

describe("GET /api/me", () => {
  it("answers 401 when signed out", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(401);
    expect(getMe).not.toHaveBeenCalled();
  });

  it("answers with the signed-in user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" }, expires: "2099-01-01T00:00:00Z" });
    vi.mocked(getMe).mockResolvedValue(me);

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(me);
    expect(getMe).toHaveBeenCalledWith("u1");
  });
});
