import type { Metadata } from "next";

import SettingsContent from "@/components/content/settings/settingsContent";

export const metadata: Metadata = { title: "Account settings · Flowboard" };

export default function Page() {
  return <SettingsContent />;
}
