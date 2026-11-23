// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { brandColours } from "./brandColours";

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");

describe("brandColours", () => {
  it.each(Object.entries(brandColours))("matches --brand-%s in globals.css", (name, hex) => {
    const token = css.match(new RegExp(`--brand-${name}:\\s*(#[0-9a-f]{6});`, "i"));
    expect(token?.[1].toLowerCase()).toBe(hex);
  });
});
