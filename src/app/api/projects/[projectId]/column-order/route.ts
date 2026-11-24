import { columnOrderSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { resetColumnOrder, setColumnOrder } from "@/server/columns/columnOrder.service";
import { route } from "@/server/lib/route";

/** My own column order (members, and managers without manageColumns; only my view changes). */
export const PUT = route(
  { auth: true, params: projectParamsSchema, body: columnOrderSchema },
  ({ user, params, body }) => setColumnOrder(user.id, params.projectId, body.columnIds)
);

/** Back to the team order, for both columns and cards. */
export const DELETE = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  resetColumnOrder(user.id, params.projectId)
);
