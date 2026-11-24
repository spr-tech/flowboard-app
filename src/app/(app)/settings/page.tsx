import type { Metadata } from "next";

import { auth } from "@/auth";
import SettingsContent from "@/components/content/settings/settingsContent";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  // How this session signed in lives in the session token, not in the cached "me".
  const session = await auth();
  return <SettingsContent signInMethod={session?.user.signInMethod} />;
}
