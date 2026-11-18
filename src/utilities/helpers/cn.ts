import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names; when two Tailwind classes conflict (px-2 vs px-4), the last one wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
