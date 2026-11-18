import type { Metadata } from "next";

import SignUpContent from "@/components/content/auth/signUpContent";

export const metadata: Metadata = { title: "Create your account · Flowboard" };

export default function Page() {
  return <SignUpContent />;
}
