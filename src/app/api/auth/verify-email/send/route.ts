import { sendVerificationCode } from "@/server/auth/emailVerification.service";
import { route } from "@/server/lib/route";

/**
 * Send a new code and link (older ones stop working). 200 with the status after sending;
 * 429 SEND_TOO_SOON within a minute of the last one, 429 SEND_LIMIT after 3 in an hour.
 */
export const POST = route({ auth: "allowUnverified" }, ({ user }) => sendVerificationCode(user.id));
