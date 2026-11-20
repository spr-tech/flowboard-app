import type { ReactNode } from "react";

import { cn } from "@/utilities/helpers/cn";

type FlipCardProps = {
  front: ReactNode;
  back: ReactNode;
  /** Size and placement of the card; give it a width and height (em works well inside headings). */
  className?: string;
  frontClassName?: string;
  backClassName?: string;
};

const faceClasses = "absolute inset-0 flex items-center justify-center gap-[0.4em] rounded-[0.22em] backface-hidden";

/** Decorative card that turns over and back on a loop. Hidden from screen readers. */
export function FlipCard({ front, back, className, frontClassName, backClassName }: FlipCardProps) {
  return (
    <span aria-hidden className={cn("inline-block align-middle perspective-[900px]", className)}>
      <span className="relative block size-full animate-flip transform-3d">
        <span className={cn(faceClasses, frontClassName)}>{front}</span>
        <span className={cn(faceClasses, "rotate-y-180", backClassName)}>{back}</span>
      </span>
    </span>
  );
}
