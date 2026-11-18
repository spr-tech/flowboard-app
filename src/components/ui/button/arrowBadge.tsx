import { ArrowRight } from "lucide-react";

/** The lime circle with an arrow that ends the main call-to-action buttons. Pass as endIcon. */
export function ArrowBadge() {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 items-center justify-center rounded-full bg-highlight text-fg-on-highlight"
    >
      <ArrowRight className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}
