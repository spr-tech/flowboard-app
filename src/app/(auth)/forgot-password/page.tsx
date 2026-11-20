import type { Metadata } from "next";

import ForgotPasswordContent from "@/components/content/auth/forgotPasswordContent";

export const metadata: Metadata = { title: "Forgot password · Flowboard" };

export default function Page() {
  return <ForgotPasswordContent />;
}
