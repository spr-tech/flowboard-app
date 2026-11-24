import { cardOrderSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { route } from "@/server/lib/route";
import { setCardOrder } from "@/server/tasks/cardOrder.service";

/** My own order of one column's cards (only my view changes). Reset with DELETE .../column-order. */
export const PUT = route({ auth: true, params: projectParamsSchema, body: cardOrderSchema }, ({ user, params, body }) =>
  setCardOrder(user.id, params.projectId, body.columnId, body.taskIds)
);
