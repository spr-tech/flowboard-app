import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/utilities/helpers/cn";
import { buttonVariants } from "./button";

export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "children"> &
  Omit<VariantProps<typeof buttonVariants>, "isIconOnly"> & {
    text: string;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
  };

/** Navigation that looks like a Button. Use this, not a Button with router.push, so it's a real link. */
export function ButtonLink({
  text,
  variant,
  size,
  startIcon,
  endIcon,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...rest}>
      {startIcon}
      {text}
      {endIcon}
    </Link>
  );
}
