import type { Metadata } from "next";

import TermsContent from "@/components/content/legal/termsContent";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The short, plain-English rules for using Flowboard.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TermsContent />;
}
