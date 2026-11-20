import type { Metadata } from "next";

import ResetPasswordContent from "@/components/content/auth/resetPasswordContent";

export const metadata: Metadata = {
  title: "Choose a new password · Flowboard",
  // The token is in this page's URL; never send it to another site in a Referer header.
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordContent token={token} />;
}
