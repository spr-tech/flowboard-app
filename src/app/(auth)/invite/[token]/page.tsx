import type { Metadata } from "next";

import InviteContent from "@/components/content/invite/inviteContent";
import { previewInvite } from "@/server/invites/invites.service";
import { inviteTitle } from "@/utilities/helpers/inviteTitle";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // The page itself loads the invite in the browser; a failed lookup here only costs the title.
  const preview = await previewInvite(token).catch(() => null);
  return {
    title: inviteTitle(preview),
    // The token is in this page's URL; never send it to another site in a Referer header.
    referrer: "no-referrer",
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  return <InviteContent token={token} />;
}
