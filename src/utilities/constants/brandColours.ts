/**
 * Brand colours as plain hex, for the few places CSS variables can't reach: the web app manifest,
 * the viewport theme colour, the social card image (next/og) and the generated icons.
 * Components use the role-named tokens in src/app/globals.css instead.
 *
 * Each value must equal its --brand-* token in globals.css; brandColours.test.ts checks that.
 */
export const brandColours = {
  espresso: "#1e1512",
  cream: "#fbf5ee",
  vermilion: "#d23f27",
  lime: "#d4f04a",
  cocoa: "#5a4a42",
  sand: "#eadfd3",
} as const;

export type BrandColour = keyof typeof brandColours;
