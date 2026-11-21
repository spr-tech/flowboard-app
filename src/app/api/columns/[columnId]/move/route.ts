import { columnParamsSchema, moveColumnSchema } from "@/models/validations/boardValidation";
import { moveColumn } from "@/server/columns/columns.service";
import { route } from "@/server/lib/route";

/** Owner: move a column in the team order. { afterColumnId?, beforeColumnId? }; no position. */
export const PATCH = route(
  { auth: true, params: columnParamsSchema, body: moveColumnSchema },
  ({ user, params, body }) => moveColumn(user.id, params.columnId, body)
);
