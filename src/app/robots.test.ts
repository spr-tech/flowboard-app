// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

beforeEach(() => vi.stubEnv("APP_URL", "https://flowboard.example"));

describe("robots.txt", () => {
  it("allows the public pages and keeps crawlers out of the app, token pages and API", () => {
    const { rules } = robots();
    expect(rules).toMatchObject({ userAgent: "*", allow: ["/", "/login", "/register"] });
    const { disallow } = rules as { disallow: string[] };
    for (const path of [
      "/dashboard",
      "/projects",
      "/settings",
      "/invite",
      "/reset-password",
      "/forgot-password",
      "/api",
    ]) {
      expect(disallow).toContain(path);
    }
  });

  it("points at the sitemap on the site's own address", () => {
    expect(robots().sitemap).toBe("https://flowboard.example/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  it("lists only the public pages", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://flowboard.example/",
      "https://flowboard.example/login",
      "https://flowboard.example/register",
    ]);
  });
});
