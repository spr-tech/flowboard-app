import type { ReactNode } from "react";

import { cn } from "@/utilities/helpers/cn";

const tones = {
  highlight: "bg-highlight text-fg-on-highlight",
  inverse: "bg-surface-inverse text-highlight",
} as const;

type HighlightProps = {
  children: ReactNode;
  tone?: keyof typeof tones;
  /** Tilted like a sticker, as on the headline words; flat for the "away." block. */
  isTilted?: boolean;
  className?: string;
};

/** A marker-pen block behind a word in a heading. Sizes in em, so it scales with the heading. */
export function Highlight({ children, tone = "highlight", isTilted = true, className }: HighlightProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-[0.14em] px-[0.14em]",
        tones[tone],
        isTilted && "-rotate-[2.5deg]",
        className,
      )}
    >
      {children}
    </span>
  );
}
