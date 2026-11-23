import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's built-in sizes. Without this list it would read
 * `text-display-hero` as a colour, and drop it when a `text-fg-…` colour comes after it.
 * Keep in step with the type scale in src/app/globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-hero",
        "display-statement",
        "display-section",
        "display-why",
        "display-why-phone",
        "display-cta",
        "display-faq",
      ],
    },
  },
});

/** Joins class names; when two Tailwind classes conflict (px-2 vs px-4), the last one wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
