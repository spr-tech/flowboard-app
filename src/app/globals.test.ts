// @vitest-environment node
// Compiles globals.css with Tailwind the way the build does, then checks the output.
// The Reveal component's own tests only check the data attributes it sets; they can't see
// whether the CSS behind those attributes made it into the build. Once, it didn't: the reveal
// keyframes sat inside @theme, Tailwind dropped them as unused, and nothing animated.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";

import { REVEAL_EFFECTS } from "@/components/ui/reveal/reveal";

const cssPath = fileURLToPath(new URL("./globals.css", import.meta.url));
let builtCss = "";

beforeAll(async () => {
  const result = await postcss([tailwindcss()]).process(readFileSync(cssPath, "utf8"), { from: cssPath });
  builtCss = result.css;
}, 30_000);

// "fan" has no keyframes: the deck's own transition fans it out.
const animatedEffects = REVEAL_EFFECTS.filter((effect) => effect !== "fan");

describe("globals.css as built", () => {
  it.each(animatedEffects)("ships the keyframes for the %s reveal", (effect) => {
    expect(builtCss).toMatch(new RegExp(`@keyframes reveal-${effect}\\s*\\{`));
  });

  it.each(animatedEffects)("points the %s reveal at its keyframes", (effect) => {
    const rule = new RegExp(`\\[data-reveal="${effect}"\\]\\s*\\{\\s*--reveal-name:\\s*reveal-${effect};`);
    expect(builtCss).toMatch(rule);
  });

  it("ships the hero load-in and sticker pop keyframes", () => {
    expect(builtCss).toMatch(/@keyframes load-in\s*\{/);
    expect(builtCss).toMatch(/@keyframes pop\s*\{/);
  });
});
