// Activity.action values (docs/plan/03-data-model.md). A string column, not a Prisma enum, so a
// new action needs no migration; this type is the list of allowed values.
export const ActivityAction = {
  ProjectCreated: "project.created",
  ProjectUpdated: "project.updated",
  ProjectColumnPermissionsChanged: "project.column_permissions_changed",
  MemberInvited: "member.invited",
  MemberJoined: "member.joined",
  MemberLeft: "member.left",
  MemberRemoved: "member.removed",
  MemberPromoted: "member.promoted",
  MemberDemoted: "member.demoted",
  ManagerPermissionsChanged: "manager.permissions_changed",
  ProjectTakeLimitChanged: "project.take_limit_changed",
  InviteCancelled: "invite.cancelled",
  TaskCreated: "task.created",
  TaskMoved: "task.moved",
  TaskCompleted: "task.completed",
  TaskUpdated: "task.updated",
  TaskDeleted: "task.deleted",
  TaskTaken: "task.taken",
  TaskNoteAdded: "task.note_added",
  TaskNoteDeleted: "task.note_deleted",
  ColumnCreated: "column.created",
  ColumnRenamed: "column.renamed",
  ColumnMoved: "column.moved",
  ColumnDoneSet: "column.done_set",
  ColumnDeleted: "column.deleted",
} as const;

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];
