import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/utilities/helpers/cn";

// Icons get the size's default unless they set their own size-* class (the arrow badge does).
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-fg-on-primary hover:bg-primary-hover",
        secondary:
          "border border-line-strong bg-surface-card text-fg-primary hover:bg-surface-sunken",
        outline: "border-[1.5px] border-fg-primary text-fg-primary hover:bg-surface-sunken",
        inverse: "bg-surface-inverse text-fg-on-inverse hover:bg-surface-inverse-raised",
        // No hover colours for these in the brand, so hover adjusts the colour itself.
        highlight: "bg-highlight text-fg-on-highlight hover:brightness-95",
        danger: "bg-danger text-fg-on-danger hover:brightness-90",
        ghost: "text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        md: "h-11 px-5 text-[15px] [&_svg:not([class*='size-'])]:size-[18px]",
        lg: "h-13 px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        xl: "h-14 px-7 text-base [&_svg:not([class*='size-'])]:size-5",
      },
      isIconOnly: {
        true: "px-0",
        false: "",
      },
    },
    compoundVariants: [
      { isIconOnly: true, size: "sm", className: "w-9" },
      { isIconOnly: true, size: "md", className: "w-11" },
      { isIconOnly: true, size: "lg", className: "w-13" },
      { isIconOnly: true, size: "xl", className: "w-14" },
    ],
    defaultVariants: { variant: "primary", size: "md", isIconOnly: false },
  },
);

type ButtonBaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  Omit<VariantProps<typeof buttonVariants>, "isIconOnly"> & {
    /** Disables the button and swaps the start icon for a spinner. */
    isLoading?: boolean;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
  };

/**
 * A button either has visible text, or it is icon-only and must say what it does
 * through aria-label, because a screen reader has nothing else to read.
 */
export type ButtonProps = ButtonBaseProps &
  ({ text: string } | { text?: undefined; startIcon: ReactNode; "aria-label": string });

export function Button({
  text,
  variant,
  size,
  isLoading = false,
  startIcon,
  endIcon,
  // Default to "button": inside a form the browser default is "submit", which submits by accident.
  type = "button",
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isIconOnly = !text;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(buttonVariants({ variant, size, isIconOnly }), className)}
      {...rest}
    >
      {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : startIcon}
      {text}
      {!isIconOnly && endIcon}
    </button>
  );
}
