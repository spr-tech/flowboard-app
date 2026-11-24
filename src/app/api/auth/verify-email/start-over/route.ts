import { startOver } from "@/server/auth/startOver.service";
import { route } from "@/server/lib/route";

/**
 * "Use a different email" on the code page: deletes my unconfirmed account if it's empty. 200 with
 * { deleted }; 400 ALREADY_VERIFIED for a confirmed account. The browser signs out after.
 */
export const POST = route({ auth: "allowUnverified" }, ({ user }) => startOver(user.id));
