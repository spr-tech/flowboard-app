import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/utilities/helpers/cn";

export type SkeletonProps = {
  /** Size and shape come from the caller (h-4 w-32, size-9 rounded-full, ...). */
  className?: string;
  /** "sunken" (default) on page and card surfaces; "card" on a sunken surface, such as a board column. */
  tone?: "sunken" | "card";
};

/**
 * A placeholder shape while data loads: a rounded block with a soft shimmer (globals.css,
 * `skeleton`), still under reduced motion. Always hidden from screen readers; the screen around
 * it says what is loading with SkeletonScreen.
 */
export function Skeleton({ className, tone = "sunken" }: SkeletonProps) {
  return <div aria-hidden className={cn("skeleton rounded-lg", tone === "card" && "skeleton-on-sunken", className)} />;
}

export type SkeletonScreenProps = Omit<HTMLAttributes<HTMLDivElement>, "aria-busy" | "children"> & {
  /** Read out instead of the shapes, e.g. "Loading the board". */
  label: string;
  /** The shapes; nothing while a load is still too new to show them (useDelayedFlag). */
  children?: ReactNode;
};

/** The container for a loading screen: aria-busy, and a visually hidden status saying what is loading. */
export function SkeletonScreen({ label, children, ...rest }: SkeletonScreenProps) {
  return (
    <div aria-busy="true" {...rest}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {children}
    </div>
  );
}
