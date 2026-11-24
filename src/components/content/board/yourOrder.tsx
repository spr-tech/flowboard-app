"use client";

import { ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { useResetColumnOrderMutation } from "@/services/columnsService";

/**
 * Shown to whoever has rearranged columns or cards for themselves. Reset brings back the team
 * order for both. Optimistic.
 */
export function YourOrder({ projectId }: { projectId: string }) {
  const [resetColumnOrder, { isLoading }] = useResetColumnOrderMutation();
  return (
    <div className="flex items-center gap-2 rounded-full bg-surface-sunken py-1 pr-1 pl-3.5 text-sm">
      <ArrowLeftRight aria-hidden className="size-4 text-fg-muted" />
      <span className="font-semibold">Your order</span>
      <Button
        text="Reset to team order"
        variant="ghost"
        size="sm"
        isLoading={isLoading}
        onClick={() =>
          void resetColumnOrder(projectId)
            .unwrap()
            .catch(() => undefined)
        }
      />
    </div>
  );
}
