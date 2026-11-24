import type { Metadata } from "next";

import PrivacyContent from "@/components/content/legal/privacyContent";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Flowboard stores about you, why, who helps run it, and how to have your account deleted.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyContent />;
}
