// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest", () => {
  const result = manifest();

  it("names the app and uses the espresso and cream brand colours", () => {
    expect(result).toMatchObject({
      name: "Flowboard",
      short_name: "Flowboard",
      theme_color: "#1e1512",
      background_color: "#fbf5ee",
    });
  });

  it("lists 192 and 512px icons that exist in public/", () => {
    const sizes = result.icons?.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of result.icons ?? []) {
      expect(existsSync(fileURLToPath(new URL(`../../public${icon.src}`, import.meta.url)))).toBe(true);
    }
  });
});
