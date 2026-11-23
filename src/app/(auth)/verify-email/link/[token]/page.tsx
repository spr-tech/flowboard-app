import type { Metadata } from "next";

import VerifyEmailLinkContent from "@/components/content/auth/verifyEmailLinkContent";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  // The token is in this page's URL; never send it to another site in a Referer header.
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <VerifyEmailLinkContent token={token} />;
}
