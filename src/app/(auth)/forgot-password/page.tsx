import type { Metadata } from "next";

import ForgotPasswordContent from "@/components/content/auth/forgotPasswordContent";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordContent />;
}
