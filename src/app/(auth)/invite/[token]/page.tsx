import type { Metadata } from "next";

import InviteContent from "@/components/content/invite/inviteContent";

export const metadata: Metadata = {
  title: "Join a project · Flowboard",
  // The token is in this page's URL; never send it to another site in a Referer header.
  referrer: "no-referrer",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InviteContent token={token} />;
}
