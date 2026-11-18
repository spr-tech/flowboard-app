import type { ReactNode } from "react";

import { cn } from "@/utilities/helpers/cn";

type RiseProps = {
  children: ReactNode;
  /** Seconds before this word starts; stagger words by ~0.07s for the headline effect. */
  delay?: number;
  className?: string;
};

/** One word (or phrase) of a headline that rises into place. Still under reduced motion. */
export function Rise({ children, delay = 0, className }: RiseProps) {
  return (
    <span className={cn("inline-block animate-rise", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </span>
  );
}
