import type { Metadata } from "next";

import VerifyEmailContent from "@/components/content/auth/verifyEmailContent";
import { searchParam, type SearchParams } from "@/utilities/helpers/searchParam";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <VerifyEmailContent callbackUrl={searchParam(params, "callbackUrl")} />;
}
