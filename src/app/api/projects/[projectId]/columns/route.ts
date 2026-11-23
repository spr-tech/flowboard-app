import { createColumnSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { createColumn } from "@/server/columns/columns.service";
import { route } from "@/server/lib/route";

/** Owner: a new column just before the done column. 201 with the column. */
export const POST = route(
  { auth: true, params: projectParamsSchema, body: createColumnSchema, status: 201 },
  ({ user, params, body }) => createColumn(user.id, params.projectId, body)
);
