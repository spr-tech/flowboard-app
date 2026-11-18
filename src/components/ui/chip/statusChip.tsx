import { cn } from "@/utilities/helpers/cn";

const statuses = {
  high: { className: "bg-status-high text-status-high-fg", label: "High" },
  medium: { className: "bg-status-medium text-status-medium-fg", label: "Medium" },
  low: { className: "bg-status-low text-status-low-fg", label: "Low" },
  done: { className: "bg-status-done text-status-done-fg", label: "Done" },
} as const;

export type ChipStatus = keyof typeof statuses;

type StatusChipProps = {
  status: ChipStatus;
  /** Defaults to the status name ("High", "Done"…). */
  label?: string;
  className?: string;
};

/** Small pill for a task's priority or done state, in the brand's status colours. */
export function StatusChip({ status, label, className }: StatusChipProps) {
  const { className: colours, label: defaultLabel } = statuses[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        colours,
        className,
      )}
    >
      {label ?? defaultLabel}
    </span>
  );
}
