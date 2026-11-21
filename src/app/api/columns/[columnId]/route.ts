import { columnParamsSchema, deleteColumnSchema, updateColumnSchema } from "@/models/validations/boardValidation";
import { deleteColumn, updateColumn } from "@/server/columns/columns.service";
import { route } from "@/server/lib/route";

/** Owner: rename, move one place left or right, or make this the done column. */
export const PATCH = route(
  { auth: true, params: columnParamsSchema, body: updateColumnSchema },
  ({ user, params, body }) => updateColumn(user.id, params.columnId, body)
);

/** Owner: { moveTasksTo } or { confirmName }. Never the last column. */
export const DELETE = route(
  { auth: true, params: columnParamsSchema, body: deleteColumnSchema },
  ({ user, params, body }) => deleteColumn(user.id, params.columnId, body)
);
