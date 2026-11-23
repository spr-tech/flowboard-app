import { columnOrderSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { resetColumnOrder, setColumnOrder } from "@/server/columns/columnOrder.service";
import { route } from "@/server/lib/route";

/** A member: my own column order (only my view changes). */
export const PUT = route(
  { auth: true, params: projectParamsSchema, body: columnOrderSchema },
  ({ user, params, body }) => setColumnOrder(user.id, params.projectId, body.columnIds)
);

/** Back to the team order. */
export const DELETE = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  resetColumnOrder(user.id, params.projectId)
);
