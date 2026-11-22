import { updateMeSchema } from "@/models/validations/authValidation";
import { getMe, updateMyName } from "@/server/account/account.service";
import { route } from "@/server/lib/route";

/** The signed-in user (see MeResponse). */
export const GET = route({ auth: true }, ({ user }) => getMe(user.id));

/** Change my name. Returns me. */
export const PATCH = route({ auth: true, body: updateMeSchema }, ({ user, body }) => updateMyName(user.id, body.name));
