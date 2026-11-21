import { describe, expect, it } from "vitest";

import { aboveIndexFor, MIN_GAP, needsRespace, placeAt, positionBetween, respacedPositions } from "./position";

describe("positionBetween", () => {
  it("takes the midpoint between two neighbours", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
    expect(positionBetween(1000, 1500)).toBe(1250);
  });

  it("goes 1000 below the last card at the bottom", () => {
    expect(positionBetween(3000, null)).toBe(4000);
  });

  it("goes 1000 above the first card at the top, even below zero", () => {
    expect(positionBetween(null, 1000)).toBe(0);
    expect(positionBetween(null, 0)).toBe(-1000);
  });

  it("starts an empty column at 1000", () => {
    expect(positionBetween(null, null)).toBe(1000);
  });
});

describe("needsRespace", () => {
  it("is false while the gap can still be split safely", () => {
    expect(needsRespace(1000, 2000)).toBe(false);
    expect(needsRespace(1000, 1000 + MIN_GAP * 3)).toBe(false);
  });

  it("is true once the neighbours are too close", () => {
    expect(needsRespace(1000, 1000 + MIN_GAP)).toBe(true);
    expect(needsRespace(1000, 1000)).toBe(true);
  });

  it("is never needed at the top, the bottom or in an empty column", () => {
    expect(needsRespace(null, 1000)).toBe(false);
    expect(needsRespace(1000, null)).toBe(false);
    expect(needsRespace(null, null)).toBe(false);
  });

  it("is reached by repeated midpoints between the same two cards, and then re-spacing fixes it", () => {
    let above = 1000;
    const below = 2000;
    let splits = 0;
    while (!needsRespace(above, below)) {
      above = positionBetween(above, below);
      splits++;
    }
    expect(splits).toBeGreaterThan(15);
    const [first, second] = respacedPositions(2);
    expect(needsRespace(first, second)).toBe(false);
  });
});

describe("respacedPositions", () => {
  it("spaces items evenly from 1000", () => {
    expect(respacedPositions(3)).toEqual([1000, 2000, 3000]);
    expect(respacedPositions(0)).toEqual([]);
  });
});

describe("aboveIndexFor", () => {
  const ids = ["a", "b", "c"];

  it("finds the slot from either neighbour, or both, or neither (the bottom)", () => {
    expect(aboveIndexFor(ids, "a", "b")).toBe(0);
    expect(aboveIndexFor(ids, "b")).toBe(1);
    expect(aboveIndexFor(ids, undefined, "a")).toBe(-1);
    expect(aboveIndexFor(ids)).toBe(2);
    expect(aboveIndexFor([])).toBe(-1);
  });

  it("refuses unknown neighbours, or neighbours that aren't next to each other", () => {
    expect(aboveIndexFor(ids, "zzz")).toBeNull();
    expect(aboveIndexFor(ids, undefined, "zzz")).toBeNull();
    expect(aboveIndexFor(ids, "a", "c")).toBeNull();
  });
});

describe("placeAt", () => {
  it("takes the midpoint, the first − 1000 or the last + 1000", () => {
    expect(placeAt([1000, 2000], 0)).toEqual({ position: 1500, respaced: null });
    expect(placeAt([1000, 2000], -1)).toEqual({ position: 0, respaced: null });
    expect(placeAt([1000, 2000], 1)).toEqual({ position: 3000, respaced: null });
    expect(placeAt([], -1)).toEqual({ position: 1000, respaced: null });
  });

  it("re-spaces the whole list first when the gap is too small", () => {
    expect(placeAt([1000, 1000.0001, 3000], 0)).toEqual({ position: 1500, respaced: [1000, 2000, 3000] });
  });
});
