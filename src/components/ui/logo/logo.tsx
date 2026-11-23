import { cn } from "@/utilities/helpers/cn";

/**
 * Colours per background, taken from the designs. Each keeps all three bars visible:
 * the tile always contrasts with the background, and the bars with the tile.
 */
const variants = {
  onLight: {
    tile: "fill-surface-inverse",
    bars: ["fill-primary", "fill-highlight", "fill-surface-page"],
    text: "text-fg-primary",
  },
  onDark: {
    tile: "fill-surface-page",
    bars: ["fill-primary", "fill-surface-inverse", "fill-highlight"],
    text: "text-fg-on-inverse",
  },
  onPrimary: {
    tile: "fill-surface-inverse",
    bars: ["fill-surface-page", "fill-highlight", "fill-surface-page"],
    text: "text-fg-on-primary",
  },
} as const;

const bars = [
  { x: 7, height: 16 },
  { x: 13, height: 11 },
  { x: 19, height: 7 },
];

export type LogoProps = {
  /** The background the logo sits on. */
  variant?: keyof typeof variants;
  /** Icon only, for tight spaces. The name stays available to screen readers. */
  isMarkOnly?: boolean;
  className?: string;
};

/** The Flowboard mark (three bars on a tile) and wordmark. */
export function Logo({ variant = "onLight", isMarkOnly = false, className }: LogoProps) {
  const colours = variants[variant];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className="shrink-0">
        <rect width="30" height="30" rx="9" className={colours.tile} />
        {bars.map((bar, index) => (
          <rect key={bar.x} x={bar.x} y="7" width="4" height={bar.height} rx="2" className={colours.bars[index]} />
        ))}
      </svg>
      <span className={cn("font-heading text-xl font-bold tracking-tight", colours.text, isMarkOnly && "sr-only")}>
        Flowboard
      </span>
    </span>
  );
}
