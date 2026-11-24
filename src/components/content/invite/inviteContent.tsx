import { auth } from "@/auth";
import { isGoogleSignInEnabled } from "@/server/auth/googleSignIn";
import { InviteScreen } from "./inviteScreen";

/**
 * /invite/[token]: public, for signed-in and signed-out visitors alike. The session is read here
 * on the server (asking /api/me while signed out would end in the sign-in redirect).
 */
export default async function InviteContent({ token }: { token: string }) {
  const session = await auth();
  return (
    <InviteScreen
      token={token}
      signedInEmail={session?.user?.email ?? null}
      isGoogleEnabled={isGoogleSignInEnabled()}
    />
  );
}
