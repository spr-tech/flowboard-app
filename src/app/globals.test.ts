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

  it("brings the hovered or focused deck card to the front: upright, lifted 22px, scaled 1.08", () => {
    const front = builtCss.match(/\.deck-card\s*\{[^}]*\}[\s\S]*?&:hover,\s*&:focus\s*\{([^}]*)\}/)?.[1] ?? "";
    const flat = builtCss.match(/\.deck-card:hover,\s*\.deck-card:focus\s*\{([^}]*)\}/g)?.join("") ?? "";
    const rules = front + flat;
    expect(rules).toMatch(/z-index:\s*10/);
    expect(rules).toMatch(/translate\(var\(--x1\),\s*calc\(var\(--y1\) - 22px\)\)\s*rotate\(0deg\)\s*scale\(1\.08\)/);
  });

  it("keeps the front deck card in its fanned place under reduced motion", () => {
    const reduced = builtCss.slice(builtCss.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(
      /\.deck-card:hover,\s*\.deck-card:focus\s*\{\s*transform:\s*translate\(var\(--x1\),\s*var\(--y1\)\)\s*rotate\(var\(--r1\)\)/
    );
  });

  it("ships the hero load-in and sticker pop keyframes", () => {
    expect(builtCss).toMatch(/@keyframes load-in\s*\{/);
    expect(builtCss).toMatch(/@keyframes pop\s*\{/);
  });

  it("ships the skeleton shimmer, and turns it off under reduced motion", () => {
    expect(builtCss).toMatch(/@keyframes skeleton-shimmer\s*\{/);
    expect(builtCss).toMatch(/animation:\s*skeleton-shimmer 1\.4s/);
    const reduced = builtCss.slice(builtCss.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(/\.skeleton::after\s*\{\s*animation:\s*none !important;\s*display:\s*none;/);
  });

  it("gives the board row a slim sand scrollbar", () => {
    const rule = builtCss.match(/\.board-scrollbar\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/scrollbar-width:\s*thin/);
    expect(rule).toMatch(/scrollbar-color:\s*var\(--line-strong\) transparent/);
  });
});
