import { describe, expect, it } from "vitest";

import { DEFAULT_SIGNED_IN_PATH, safeCallbackUrl } from "./safeCallbackUrl";

const ORIGIN = "https://flowboard.test";

describe("safeCallbackUrl", () => {
  it.each([
    ["/projects", "/projects"],
    ["/projects/abc?task=1#notes", "/projects/abc?task=1#notes"],
    // Auth.js sends full URLs on our own origin.
    [`${ORIGIN}/settings`, "/settings"],
    [`${ORIGIN}/projects?filter=owned`, "/projects?filter=owned"],
  ])("keeps a same-site destination: %s", (input, expected) => {
    expect(safeCallbackUrl(input, ORIGIN)).toBe(expected);
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example",
    "javascript:alert(1)",
    "http://flowboard.test/projects", // http, not https: a different origin
    "not a url",
  ])("refuses another site, sending to the dashboard instead: %s", (input) => {
    expect(safeCallbackUrl(input, ORIGIN)).toBe(DEFAULT_SIGNED_IN_PATH);
  });

  it("uses the dashboard when there's no callbackUrl", () => {
    expect(safeCallbackUrl(undefined, ORIGIN)).toBe("/dashboard");
    expect(safeCallbackUrl("", ORIGIN)).toBe("/dashboard");
  });
});
