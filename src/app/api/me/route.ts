import { getMe } from "@/server/account/account.service";
import { route } from "@/server/lib/route";

/** The signed-in user (see MeResponse). */
export const GET = route({ auth: true }, ({ user }) => getMe(user.id));
