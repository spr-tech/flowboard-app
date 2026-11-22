// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { POST as accept } from "./accept/route";
import { GET } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/invites/invites.service", () => ({
  previewInvite: vi.fn(async () => ({ state: "used" })),
  acceptInvite: vi.fn(async () => ({ projectId: "p1", projectName: "Website relaunch" })),
}));
const { acceptInvite, previewInvite } = await import("@/server/invites/invites.service");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/invites/token/:token", () => {
  it("is public: answers signed out, without reading the session", async () => {
    const response = await GET(jsonRequest("/api/invites/token/tok", "GET"), segment({ token: "tok" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "used" });
    expect(previewInvite).toHaveBeenCalledWith("tok");
    expect(auth).not.toHaveBeenCalled();
  });
});

describe("POST /api/invites/token/:token/accept", () => {
  it("needs a signed-in user", async () => {
    signInAs(null);

    const response = await accept(jsonRequest("/api/invites/token/tok/accept", "POST"), segment({ token: "tok" }));

    expect(response.status).toBe(401);
    expect(acceptInvite).not.toHaveBeenCalled();
  });

  it("joins as the signed-in user", async () => {
    signInAs("ada");

    const response = await accept(jsonRequest("/api/invites/token/tok/accept", "POST"), segment({ token: "tok" }));

    expect(response.status).toBe(200);
    expect(acceptInvite).toHaveBeenCalledWith("ada", "tok");
  });
});
