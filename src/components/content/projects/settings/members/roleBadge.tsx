import type { ProjectRole } from "@/models/responses/projectResponses";
import { cn } from "@/utilities/helpers/cn";

const styles: Record<ProjectRole, { text: string; className: string }> = {
  OWNER: { text: "Owner", className: "bg-surface-inverse text-highlight" },
  MANAGER: { text: "Manager", className: "bg-badge-manager text-badge-manager-fg" },
  MEMBER: { text: "Member", className: "bg-badge-member text-badge-member-fg" },
};

/** Owner (espresso), Manager (teal) or Member (sand). */
export function RoleBadge({ role }: { role: ProjectRole }) {
  const { text, className } = styles[role];
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", className)}>{text}</span>;
}
