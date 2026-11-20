// @vitest-environment node
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { z } from "zod";

import { auth } from "@/auth";
import { ApiError } from "@/server/lib/errors";
import { route } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
// auth() is overloaded (it can also be middleware); here it's only ever "read the session".
const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

const session: Session = { user: { id: "u1", email: "ada@example.com" }, expires: "2099-01-01T00:00:00Z" };

function request(path = "/api/thing", init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}
function segment(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(session);
});

describe("route()", () => {
  it("answers 401 in our error shape without a session, and never calls the handler", async () => {
    mockAuth.mockResolvedValue(null);
    const handler = vi.fn();

    const response = await route({ auth: true }, handler)(request(), segment());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Your session has ended. Please sign in again." },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs a public route without reading the session, with user null", async () => {
    const handler = vi.fn(() => ({ ok: true }));

    const response = await route({ auth: false }, handler)(request(), segment());

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ user: null }));
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("passes the signed-in user and sends the result as JSON", async () => {
    const response = await route({ auth: true }, ({ user }) => ({ id: user.id }))(request(), segment());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "u1" });
  });

  it("uses the given success status", async () => {
    const response = await route({ auth: true, status: 201 }, () => ({ created: true }))(request(), segment());

    expect(response.status).toBe(201);
  });

  it("awaits params and validates them with the schema", async () => {
    const handler = vi.fn(({ params }: { params: { projectId: string } }) => params);
    const projectRoute = route({ auth: true, params: z.object({ projectId: z.string().min(1) }) }, handler);

    const response = await projectRoute(request("/api/projects/p1"), segment({ projectId: "p1" }));

    expect(await response.json()).toEqual({ projectId: "p1" });
  });

  it("answers 400 with per-field messages when the body fails its schema", async () => {
    const handler = vi.fn();
    const createRoute = route({ auth: true, body: z.object({ name: z.string().min(3, "Name is too short") }) }, handler);

    const response = await createRoute(
      request("/api/thing", { method: "POST", body: JSON.stringify({ name: "x" }) }),
      segment(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_FAILED", message: "Some fields need fixing.", fields: { name: "Name is too short" } },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("validates the query string", async () => {
    const listRoute = route({ auth: true, query: z.object({ group: z.enum(["due", "project"]) }) }, ({ query }) => query);

    expect((await listRoute(request("/api/me/tasks?group=due"), segment())).status).toBe(200);
    expect((await listRoute(request("/api/me/tasks?group=nope"), segment())).status).toBe(400);
  });

  it("turns a thrown ApiError into its status and our error shape", async () => {
    const response = await route({ auth: true }, () => {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "We couldn't find that project.");
    })(request(), segment());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." },
    });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await route({ auth: true }, () => {
      throw new Error("connection string with secrets");
    })(request(), segment());

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secrets");
  });
});
