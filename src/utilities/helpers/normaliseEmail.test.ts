import { describe, expect, it } from "vitest";

import { normaliseEmail } from "./normaliseEmail";

describe("normaliseEmail", () => {
  it.each([
    ["Ada@Example.COM", "ada@example.com"],
    ["  ada@example.com\t", "ada@example.com"],
    ["ada@example.com", "ada@example.com"],
  ])("turns %j into %j", (input, expected) => {
    expect(normaliseEmail(input)).toBe(expected);
  });
});
