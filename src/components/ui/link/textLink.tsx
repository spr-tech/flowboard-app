import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/utilities/helpers/cn";

/** An inline link in running text, in the brand's link colour. */
export function TextLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("rounded-sm font-semibold text-fg-link transition-colors hover:text-fg-link-hover", className)}
      {...rest}
    />
  );
}
