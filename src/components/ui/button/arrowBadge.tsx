import { ArrowRight } from "lucide-react";

/**
 * The lime circle with an arrow that ends the main call-to-action buttons. Pass as endIcon.
 * Give the button the `group/cta` class and the arrow nudges right and turns when it is hovered.
 */
export function ArrowBadge() {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 items-center justify-center rounded-full bg-highlight text-fg-on-highlight transition-[translate,rotate] duration-200 ease-out motion-safe:group-hover/cta:translate-x-1 motion-safe:group-hover/cta:-rotate-12 motion-safe:group-focus-visible/cta:translate-x-1 motion-safe:group-focus-visible/cta:-rotate-12"
    >
      <ArrowRight className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}
