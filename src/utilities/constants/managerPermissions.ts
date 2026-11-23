// A manager's switches as the owner sees them (Settings › Members › Permissions), in this order.
import type { ManagerPermission } from "@/utilities/helpers/permissions";

export const MANAGER_PERMISSION_LABELS: { key: ManagerPermission; label: string; hint: string }[] = [
  {
    key: "createAndAssign",
    label: "Create and assign tasks",
    hint: "Assign tasks to anyone, or leave them unassigned",
  },
  { key: "editAnyTask", label: "Edit any task", hint: "Title, description, priority and due date" },
  { key: "moveAnyTask", label: "Move any task", hint: "Between columns, including into the done column" },
  { key: "teamOrder", label: "Change team task order in columns", hint: "Card drags change everyone's order" },
  { key: "manageColumns", label: "Manage columns", hint: "Add, rename and reorder the team's columns" },
  { key: "deleteAnyTask", label: "Delete any task", hint: "Not just the tasks they created" },
  { key: "deleteColumns", label: "Delete columns", hint: "Never the done column" },
  { key: "inviteMembers", label: "Invite people", hint: "Send, resend and cancel invites" },
  { key: "removeMembers", label: "Remove members", hint: "Members only, never a manager or the owner" },
];
