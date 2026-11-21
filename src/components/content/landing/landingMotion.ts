// Hover and focus effects shared across the landing page.
//
// Tailwind v4's translate-*, rotate-* and scale-* classes set the individual CSS properties
// `translate`, `rotate` and `scale`, never `transform`. The scroll reveal animates `transform`
// (globals.css, "Scroll reveals"), so the two never fight, and each element's own transition
// here (with delay-0) means a hover never picks up the reveal's 0.7 s duration or stagger delay.
//
// Movement and scaling sit behind motion-safe:, so prefers-reduced-motion keeps only the
// colour and shadow changes.

/** Buttons and button-links: lift 3px with a shadow on hover or focus, press down when clicked. */
export const buttonLift =
  "transition-[color,background-color,border-color,translate,scale,box-shadow] duration-200 ease-out delay-0 " +
  "hover:shadow-lift focus-visible:shadow-lift " +
  "motion-safe:hover:-translate-y-[3px] motion-safe:focus-visible:-translate-y-[3px] " +
  "motion-safe:active:translate-y-0 motion-safe:active:scale-97";

/**
 * Step cards and feature tiles: lift 8px and tip back a little, with a soft shadow.
 * The cards themselves aren't focusable, so focus on a link inside one (:has) counts too.
 */
export const tileLift =
  "transition-[translate,rotate,box-shadow] duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-0 " +
  "hover:shadow-tile has-focus-visible:shadow-tile " +
  "motion-safe:hover:-translate-y-2 motion-safe:hover:-rotate-[0.8deg] " +
  "motion-safe:has-focus-visible:-translate-y-2 motion-safe:has-focus-visible:-rotate-[0.8deg]";
