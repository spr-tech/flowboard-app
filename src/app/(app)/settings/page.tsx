import type { Metadata } from "next";

import SettingsContent from "@/components/content/settings/settingsContent";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsContent />;
}
