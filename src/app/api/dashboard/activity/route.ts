import { getTeamActivity } from "@/server/activity/activity.service";
import { route } from "@/server/lib/route";

/** The newest 20 events across my projects (the browser polls this every 30 seconds). */
export const GET = route({ auth: true }, ({ user }) => getTeamActivity(user.id));
