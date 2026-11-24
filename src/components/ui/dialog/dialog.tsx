"use client";

import type { ReactNode } from "react";

import {
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { cn } from "@/utilities/helpers/cn";

const widthClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;

// As a bottom sheet the panel is full width until md, so the width cap starts there instead.
const sheetWidthClasses = {
  sm: "md:max-w-sm",
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
} as const;

// Under md: pinned to the bottom, full width, rounded top corners only, sliding up.
const sheetClasses =
  "max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-w-none sm:max-w-none max-md:rounded-b-none max-md:border-b-0 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-md:data-open:zoom-in-100 max-md:data-open:slide-in-from-bottom max-md:data-closed:zoom-out-100 max-md:data-closed:slide-out-to-bottom";

export type DialogProps = {
  isOpen: boolean;
  /** Called on Escape, overlay click and the close button. */
  onClose: () => void;
  title: string;
  description?: string;
  width?: keyof typeof widthClasses;
  /** "sheet": a bottom sheet on phones (under md), centred from md up. */
  layout?: "center" | "sheet";
  /** Buttons row, right-aligned on desktop, stacked on phone. */
  footer?: ReactNode;
  children?: ReactNode;
};

/**
 * Modal shell: overlay, panel, title row, close button, Escape to close.
 * Knows nothing about what is inside it; a form placed here doesn't know it's in a modal.
 * Never taller than 85% of the screen: the title and footer stay put and only the body scrolls.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  width = "md",
  layout = "center",
  footer,
  children,
}: DialogProps) {
  const isSheet = layout === "sheet";
  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // Radix warns when a dialog has no description; undefined tells it that's deliberate.
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "flex max-h-[85dvh] flex-col gap-5 rounded-card-lg border border-line-subtle bg-surface-card p-6 text-fg-primary ring-0 shadow-xl",
          isSheet ? [sheetClasses, sheetWidthClasses[width]] : widthClasses[width]
        )}
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription className="text-fg-secondary">{description}</DialogDescription>}
        </DialogHeader>
        {children && <div className="-mx-6 -my-1 min-h-0 flex-1 overflow-y-auto px-6 py-1">{children}</div>}
        {footer && <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </DialogContent>
    </DialogRoot>
  );
}
