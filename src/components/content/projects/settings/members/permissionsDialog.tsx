"use client";

import { Button } from "@/components/ui/button/button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { toast } from "@/components/ui/toast/toast";
import { useSetManagerPermissionsMutation } from "@/services/membersService";
import { MANAGER_PERMISSION_LABELS } from "@/utilities/constants/managerPermissions";
import { cn } from "@/utilities/helpers/cn";
import type { ManagerPermission, ManagerPermissions } from "@/utilities/helpers/permissions";

type PermissionsDialogProps = {
  projectId: string;
  userId: string;
  name: string;
  permissions: ManagerPermissions;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The owner turns one manager's switches on and off. Each switch saves when it changes, with a
 * toast; the list refetches, so what shows is what the server saved.
 */
export function PermissionsDialog({ projectId, userId, name, permissions, isOpen, onClose }: PermissionsDialogProps) {
  const [save, { isLoading }] = useSetManagerPermissionsMutation();

  const toggle = async (key: ManagerPermission) => {
    try {
      await save({ projectId, userId, [key]: !permissions[key] }).unwrap();
      toast({ type: "success", message: "Permissions saved" });
    } catch {
      // The base query showed why; the switch stays as it was.
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${name}'s permissions`}
      description="What this manager can do. Project settings, roles and the done column stay yours."
      footer={<Button text="Done" variant="outline" onClick={onClose} />}
    >
      <ul className="flex flex-col divide-y divide-line-subtle">
        {MANAGER_PERMISSION_LABELS.map(({ key, label, hint }) => {
          const on = permissions[key];
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-fg-secondary">{hint}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={label}
                disabled={isLoading}
                onClick={() => void toggle(key)}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-focus focus-visible:outline-none disabled:cursor-wait",
                  on ? "bg-surface-inverse" : "bg-line-strong"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-block size-5 rounded-full bg-surface-card shadow transition-transform",
                    on ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
