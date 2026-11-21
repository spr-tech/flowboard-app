"use client";

import { Pin } from "lucide-react";

import { toast } from "@/components/ui/toast/toast";
import { usePinProjectMutation, useUnpinProjectMutation } from "@/services/projectsService";
import { cn } from "@/utilities/helpers/cn";
import { pinToastMessage } from "@/utilities/helpers/pinToastMessage";

type PinToggleProps = {
  projectId: string;
  name: string;
  isPinned: boolean;
  /** How many of my projects are pinned right now (this pin would be the next one). */
  pinnedCount: number;
  className?: string;
};

/**
 * Pins a project for me. The card changes straight away (optimistic, in projectsService);
 * the toast waits for the server, so it never says "pinned" for a pin that failed.
 * It sits next to the card's link, never inside it: a button inside a link is invalid HTML.
 */
export function PinToggle({ projectId, name, isPinned, pinnedCount, className }: PinToggleProps) {
  const [pinProject] = usePinProjectMutation();
  const [unpinProject] = useUnpinProjectMutation();
  const label = `${isPinned ? "Unpin" : "Pin"} ${name}`;

  const toggle = async () => {
    try {
      if (isPinned) {
        await unpinProject(projectId).unwrap();
        toast({ type: "success", message: pinToastMessage(name, { pinned: false }) });
      } else {
        await pinProject(projectId).unwrap();
        toast({ type: "success", message: pinToastMessage(name, { pinned: true, pinNumber: pinnedCount + 1 }) });
      }
    } catch {
      // Nothing to do: the cache is already back as it was, and the base query showed why.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isPinned}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-[14px] border-[1.5px] text-fg-primary transition-colors",
        isPinned
          ? "border-highlight bg-highlight hover:brightness-95"
          : "border-line-strong bg-surface-card hover:bg-surface-sunken",
        className
      )}
    >
      <Pin aria-hidden className={cn("size-[18px]", isPinned && "fill-current")} />
    </button>
  );
}
