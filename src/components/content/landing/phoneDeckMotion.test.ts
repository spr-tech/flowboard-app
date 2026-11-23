import { describe, expect, it } from "vitest";

import { cardPose, currentCard, dealtFromScroll, DECK_STEP_PX } from "./phoneDeckMotion";

const VIEWPORT = 844;
const TRACK = 6 * 0.55 * VIEWPORT; // 330svh
const PINNED = { top: 286, height: 272 }; // centred on an 844px screen
const DECK_TOP_PX = PINNED.top;
const distance = TRACK - PINNED.height;

describe("dealtFromScroll", () => {
  it("deals nothing before the deck pins, and everything by the end of the track", () => {
    expect(dealtFromScroll(500, TRACK, PINNED, 6)).toBe(0);
    expect(dealtFromScroll(DECK_TOP_PX, TRACK, PINNED, 6)).toBe(0);
    expect(dealtFromScroll(DECK_TOP_PX - distance, TRACK, PINNED, 6)).toBe(6);
    expect(dealtFromScroll(-99999, TRACK, PINNED, 6)).toBe(6);
  });

  it("deals everything at once if the track is no taller than the deck", () => {
    expect(dealtFromScroll(0, 200, PINNED, 6)).toBe(6);
  });

  it("lands the last card before the end, so it rests while still pinned", () => {
    const nearEnd = dealtFromScroll(DECK_TOP_PX - distance * 0.93, TRACK, PINNED, 6);
    expect(nearEnd).toBe(6);
  });

  it("grows steadily in between", () => {
    const quarter = dealtFromScroll(DECK_TOP_PX - distance / 4, TRACK, PINNED, 6);
    const half = dealtFromScroll(DECK_TOP_PX - distance / 2, TRACK, PINNED, 6);
    expect(quarter).toBeGreaterThan(1);
    expect(half).toBeGreaterThan(quarter);
    expect(half).toBeLessThan(6);
  });
});

describe("cardPose", () => {
  it("a card not dealt yet is invisible and below", () => {
    const pose = cardPose(2, 1, 700);
    expect(pose.opacity).toBe(0);
    expect(pose.y).toBe(700);
  });

  it("a card sliding in is turned a little and partway up", () => {
    const pose = cardPose(1, 1.5, 700);
    expect(pose.opacity).toBe(1);
    expect(pose.y).toBeGreaterThan(0);
    expect(pose.y).toBeLessThan(700);
    expect(Math.abs(pose.rotate)).toBeGreaterThan(0);
  });

  it("the top card is upright, full size and fully readable", () => {
    expect(cardPose(3, 4, 700)).toEqual({ y: 0, rotate: 0, scale: 1, opacity: 1 });
  });

  it("cards underneath step back 14px and 5% per level", () => {
    expect(cardPose(2, 4, 700)).toMatchObject({ y: -DECK_STEP_PX, scale: 0.95, opacity: 1 });
    expect(cardPose(1, 4, 700)).toMatchObject({ y: -2 * DECK_STEP_PX, scale: 0.9, opacity: 1 });
    expect(cardPose(0, 4, 700)).toMatchObject({ y: -3 * DECK_STEP_PX, scale: expect.closeTo(0.85), opacity: 1 });
  });

  it("shows at most three levels underneath", () => {
    expect(cardPose(0, 5, 700)).toMatchObject({ y: -3 * DECK_STEP_PX, opacity: 0 });
    expect(cardPose(0, 6, 700).opacity).toBe(0);
  });
});

describe("currentCard", () => {
  it("is the card on (or sliding onto) the top, -1 before the first", () => {
    expect(currentCard(0, 6)).toBe(-1);
    expect(currentCard(0.2, 6)).toBe(0);
    expect(currentCard(3, 6)).toBe(2);
    expect(currentCard(6, 6)).toBe(5);
  });
});
