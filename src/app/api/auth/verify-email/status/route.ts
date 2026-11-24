import { getVerificationStatus } from "@/server/auth/emailVerification.service";
import { route } from "@/server/lib/route";

/** The address, whether it's confirmed, and when "Resend code" works again. Read-only. */
export const GET = route({ auth: "allowUnverified" }, ({ user }) => getVerificationStatus(user.id));
