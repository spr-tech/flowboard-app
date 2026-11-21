// Activity.action values (docs/plan/03-data-model.md). A string column, not a Prisma enum, so a
// new action needs no migration; this type is the list of allowed values.
export const ActivityAction = {
  ProjectCreated: "project.created",
  ProjectUpdated: "project.updated",
  ProjectColumnPermissionsChanged: "project.column_permissions_changed",
  MemberJoined: "member.joined",
  MemberLeft: "member.left",
  TaskCreated: "task.created",
  TaskMoved: "task.moved",
  TaskCompleted: "task.completed",
  TaskUpdated: "task.updated",
  TaskDeleted: "task.deleted",
  ColumnCreated: "column.created",
  ColumnRenamed: "column.renamed",
  ColumnMoved: "column.moved",
  ColumnDoneSet: "column.done_set",
  ColumnDeleted: "column.deleted",
} as const;

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];
