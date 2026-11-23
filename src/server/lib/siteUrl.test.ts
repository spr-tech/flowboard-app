// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { siteUrl } from "./siteUrl";

beforeEach(() => {
  vi.stubEnv("APP_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
});

describe("siteUrl", () => {
  it("prefers APP_URL, without a trailing slash", () => {
    vi.stubEnv("APP_URL", "https://flowboard.example/");
    vi.stubEnv("VERCEL_BRANCH_URL", "flowboard-git-rebuild.vercel.app");
    expect(siteUrl()).toBe("https://flowboard.example");
  });

  it("uses the production domain on Vercel production deployments", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "flowboard.example");
    vi.stubEnv("VERCEL_BRANCH_URL", "flowboard-git-master.vercel.app");
    expect(siteUrl()).toBe("https://flowboard.example");
  });

  it("uses the branch URL on previews", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "flowboard.example");
    vi.stubEnv("VERCEL_BRANCH_URL", "flowboard-git-rebuild.vercel.app");
    expect(siteUrl()).toBe("https://flowboard-git-rebuild.vercel.app");
  });

  it("falls back to localhost instead of throwing, even in production builds", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
