// The phone "Why Flowboard" deck's maths, kept pure so it's tested without a browser.
// Scroll through the deck's tall track → how many cards are dealt (a fraction while one is
// sliding in) → each card's transform and opacity.

/** Each card underneath moves up this much per level, so its top edge peeks above the next. */
export const DECK_STEP_PX = 14;
/** ...and shrinks by this much per level. */
export const DECK_STEP_SCALE = 0.05;
/** Deeper cards fade out, so at most this many show under the top card. */
export const DECK_VISIBLE_LEVELS = 3;
/**
 * The pinned deck is centred on the screen, but never higher than this: below the sticky landing
 * nav, with room for the peeking edges.
 */
export const DECK_MIN_TOP_PX = 136;
/** How far a card turns while it slides in; alternate cards turn the other way. */
const ENTER_TILT_DEG = 9;
/** Half a card's worth of scrolling after the last one lands, so it rests before the page moves on. */
const END_HOLD = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Where the pinned deck sits in the track: its sticky `top` and its own height. */
export type PinnedDeck = { top: number; height: number };

/**
 * How many cards are dealt, from 0 to `count`, given where the track is. The deck is pinned
 * from when the track's top reaches the deck's sticky top until the track's bottom reaches the
 * deck's bottom; that distance is the whole deal.
 */
export function dealtFromScroll(trackTop: number, trackHeight: number, pinned: PinnedDeck, count: number) {
  const distance = trackHeight - pinned.height;
  if (distance <= 0) return count;
  const progress = clamp((pinned.top - trackTop) / distance, 0, 1);
  return clamp(progress * (count + END_HOLD), 0, count);
}

export type CardPose = { y: number; rotate: number; scale: number; opacity: number };

/** Ease out: fast start, soft landing. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Card `index`'s pose when `dealt` cards are down. Sliding in: from `enterFromPx` below, turned
 * a little. Landed: upright on top. Covered: up DECK_STEP_PX and DECK_STEP_SCALE smaller per
 * card above it, fading out past DECK_VISIBLE_LEVELS.
 */
export function cardPose(index: number, dealt: number, enterFromPx: number): CardPose {
  const arrival = easeOut(clamp(dealt - index, 0, 1));
  const depth = Math.max(0, dealt - index - 1);
  const level = Math.min(depth, DECK_VISIBLE_LEVELS);
  const tilt = index % 2 === 0 ? -ENTER_TILT_DEG : ENTER_TILT_DEG;
  return {
    y: (1 - arrival) * enterFromPx - level * DECK_STEP_PX,
    rotate: (1 - arrival) * tilt,
    scale: 1 - level * DECK_STEP_SCALE,
    opacity: dealt <= index ? 0 : clamp(DECK_VISIBLE_LEVELS + 1 - depth, 0, 1),
  };
}

/** The card on top (or sliding onto the top) for the progress dots; -1 before the first. */
export function currentCard(dealt: number, count: number) {
  return clamp(Math.ceil(dealt) - 1, -1, count - 1);
}
