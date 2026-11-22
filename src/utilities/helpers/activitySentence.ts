// An Activity row as a plain sentence, in parts so the page can bold the names:
//   { actor: "Ada", text: "moved", target: "Fix sign-in", detail: "to Done" }
//   → "Ada moved Fix sign-in to Done" (the feed adds "in <project> · 2h ago").
// The server only stores what happened (action + meta); the words live here.
import type { ActivityItem } from "@/models/responses/dashboardResponses";

/** `note` is a side remark shown after a dot: "Bisi joined Capstone · Invited by Alex". */
export type ActivityParts = {
  actor: string;
  text: string;
  target: string | null;
  detail: string | null;
  note: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  assigneeId: "assignee",
  dueDate: "due date",
};

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** `meId` makes my own rows read "You …". `inTask`: the task drawer, where the task is "it". */
export function describeActivity(item: ActivityItem, meId: string | null, inTask = false): ActivityParts {
  const meta = item.meta ?? {};
  const actor = item.actor.id === meId ? "You" : item.actor.name?.trim() || "Someone";
  const title = inTask ? "it" : (item.task?.title ?? str(meta.title) ?? "a task");
  const parts = (
    text: string,
    target: string | null = null,
    detail: string | null = null,
    note: string | null = null
  ) => ({
    actor,
    text,
    target,
    detail,
    note,
  });

  switch (item.action) {
    case "task.created":
      return parts("created", title, str(meta.column) ? `in ${str(meta.column)}` : null);
    case "task.moved":
    case "task.completed":
      return parts("moved", title, str(meta.to) ? `to ${str(meta.to)}` : null);
    case "task.deleted":
      return parts("deleted", str(meta.title) ?? "a task");
    case "task.updated": {
      if ("assignee" in meta) {
        const assignee = meta.assignee as { name?: unknown } | null;
        return assignee
          ? parts("assigned", title, `to ${str(assignee.name) ?? "someone"}`)
          : parts("unassigned", title);
      }
      const fields = Array.isArray(meta.fields) ? meta.fields.map((field) => FIELD_LABELS[String(field)] ?? field) : [];
      return parts("changed", fields.length ? `the ${fields.join(" and ")} of` : "", title);
    }
    case "column.created":
      return parts("added the column", str(meta.name));
    case "column.renamed":
      return parts("renamed the column", str(meta.from), str(meta.to) ? `to ${str(meta.to)}` : null);
    case "column.moved":
      return parts("moved the column", str(meta.name));
    case "column.done_set":
      return parts("made", str(meta.name), "the done column");
    case "column.deleted":
      return parts("deleted the column", str(meta.name));
    case "project.created":
      return parts("created", item.project.name);
    case "project.updated":
      return parts("updated the details of", item.project.name);
    case "project.column_permissions_changed":
      return parts("changed who can add columns to", item.project.name);
    case "member.invited":
      return parts(meta.resent ? "sent a new invite to" : "invited", str(meta.email));
    case "member.joined":
      return parts("joined", item.project.name, null, str(meta.invitedBy) ? `Invited by ${str(meta.invitedBy)}` : null);
    case "member.left":
      return parts("left", item.project.name);
    case "member.removed": {
      const count = typeof meta.unassignedTaskCount === "number" ? meta.unassignedTaskCount : 0;
      return parts("removed", str(meta.name), null, count ? `${plural(count, "task")} unassigned` : null);
    }
    case "invite.cancelled":
      return parts("cancelled the invite for", str(meta.email));
    default:
      return parts("made a change in", item.project.name);
  }
}

/** The whole sentence as text (screen readers, tests). */
export function activitySentence(item: ActivityItem, meId: string | null, inTask = false): string {
  const { actor, text, target, detail, note } = describeActivity(item, meId, inTask);
  const sentence = [actor, text, target, detail].filter(Boolean).join(" ");
  return note ? `${sentence} · ${note}` : sentence;
}
