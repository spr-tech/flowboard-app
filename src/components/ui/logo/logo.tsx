import { cn } from "@/utilities/helpers/cn";

export type LogoProps = {
  /** "inverse" for dark surfaces (the sidebar), "default" for cream ones. */
  tone?: "default" | "inverse";
  /** Icon only, for tight spaces. */
  isMarkOnly?: boolean;
  className?: string;
};

/** The Flowboard mark (three bars on a tile) and wordmark, from the sign-in design. */
export function Logo({ tone = "default", isMarkOnly = false, className }: LogoProps) {
  const isInverse = tone === "inverse";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className="shrink-0">
        <rect
          width="30"
          height="30"
          rx="9"
          className={isInverse ? "fill-surface-page" : "fill-surface-inverse"}
        />
        <rect x="7" y="7" width="4" height="16" rx="2" className="fill-primary" />
        <rect
          x="13"
          y="7"
          width="4"
          height="11"
          rx="2"
          className={isInverse ? "fill-surface-inverse" : "fill-surface-page"}
        />
        <rect x="19" y="7" width="4" height="7" rx="2" className="fill-highlight" />
      </svg>
      <span
        className={cn(
          "font-heading text-xl font-bold",
          isInverse ? "text-fg-on-inverse" : "text-fg-primary",
          isMarkOnly && "sr-only",
        )}
      >
        Flowboard
      </span>
    </span>
  );
}
