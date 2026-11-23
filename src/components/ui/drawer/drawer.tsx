"use client";

import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/primitives/sheet";
import { cn } from "@/utilities/helpers/cn";

// Repeats the primitive's `data-[side=…]` prefix so these replace its max width rather than lose to it.
const widthClasses = {
  sm: "data-[side=left]:sm:max-w-xs data-[side=right]:sm:max-w-xs",
  md: "data-[side=left]:sm:max-w-md data-[side=right]:sm:max-w-md",
  // The task drawer (460px, docs/designs/board.dc.html).
  lg: "data-[side=left]:sm:max-w-[460px] data-[side=right]:sm:max-w-[460px]",
} as const;

export type DrawerProps = {
  isOpen: boolean;
  /** Called on Escape, overlay click and the close button. */
  onClose: () => void;
  /** Always required: screen readers announce it when the drawer opens. */
  title: string;
  /** Hide the title visually when the content already makes it obvious (a nav menu). */
  isTitleHidden?: boolean;
  description?: string;
  side?: "left" | "right";
  width?: keyof typeof widthClasses;
  footer?: ReactNode;
  /** For drawers that need a different surface, such as the dark sidebar on phones. */
  className?: string;
  children?: ReactNode;
};

/** A panel that slides in from the side. Built on Radix Dialog, so focus stays inside it while open. */
export function Drawer({
  isOpen,
  onClose,
  title,
  isTitleHidden = false,
  description,
  side = "right",
  width = "md",
  footer,
  className,
  children,
}: DrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={side}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn("gap-0 border-line-subtle bg-surface-card text-fg-primary", widthClasses[width], className)}
      >
        <SheetHeader className={cn("px-6 pt-6 pb-4 pr-12", isTitleHidden && "sr-only")}>
          <SheetTitle className="text-xl font-bold tracking-tight">{title}</SheetTitle>
          {description && <SheetDescription className="text-fg-secondary">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-line-subtle px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
