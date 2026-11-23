// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("./projectName.service", () => ({ findProjectName: vi.fn() }));

const { auth } = await import("@/auth");
const { notFound } = await import("next/navigation");
const { findProjectName } = await import("./projectName.service");
const { projectNameOrNotFound } = await import("./projectPage");

const signedIn = (id: string) => vi.mocked(auth).mockResolvedValue({ user: { id }, expires: "" } as never);

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(findProjectName).mockReset();
});

describe("projectNameOrNotFound", () => {
  it("returns the name of a project I'm in", async () => {
    signedIn("u1");
    vi.mocked(findProjectName).mockResolvedValue("Website relaunch");

    await expect(projectNameOrNotFound("p1")).resolves.toBe("Website relaunch");
    expect(findProjectName).toHaveBeenCalledWith("u1", "p1");
  });

  it("shows the not-found page for a missing project or one I'm not in", async () => {
    signedIn("u1");
    vi.mocked(findProjectName).mockResolvedValue(null);

    await expect(projectNameOrNotFound("p2")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("looks nothing up without a session (the layout redirects)", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    await expect(projectNameOrNotFound("p3")).resolves.toBeNull();
    expect(findProjectName).not.toHaveBeenCalled();
  });
});
