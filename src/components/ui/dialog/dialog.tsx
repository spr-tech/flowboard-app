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

export type DialogProps = {
  isOpen: boolean;
  /** Called on Escape, overlay click and the close button. */
  onClose: () => void;
  title: string;
  description?: string;
  width?: keyof typeof widthClasses;
  /** Buttons row, right-aligned on desktop, stacked on phone. */
  footer?: ReactNode;
  children?: ReactNode;
};

/**
 * Modal shell: overlay, panel, title row, close button, Escape to close.
 * Knows nothing about what is inside it; a form placed here doesn't know it's in a modal.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  width = "md",
  footer,
  children,
}: DialogProps) {
  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // Radix warns when a dialog has no description; undefined tells it that's deliberate.
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "gap-5 rounded-card-lg border border-line-subtle bg-surface-card p-6 text-fg-primary ring-0 shadow-xl",
          widthClasses[width],
        )}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-fg-secondary">{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>
        )}
      </DialogContent>
    </DialogRoot>
  );
}
