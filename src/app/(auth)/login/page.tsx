import type { Metadata } from "next";

import SignInContent from "@/components/content/auth/signInContent";

export const metadata: Metadata = { title: "Sign in · Flowboard" };

export default function Page() {
  return <SignInContent />;
}
