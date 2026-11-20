import type { Metadata } from "next";

import SignInContent from "@/components/content/auth/signInContent";
import { searchParam, type SearchParams } from "@/utilities/helpers/searchParam";

export const metadata: Metadata = { title: "Sign in · Flowboard" };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <SignInContent
      callbackUrl={searchParam(params, "callbackUrl")}
      error={searchParam(params, "error")}
      reason={searchParam(params, "reason")}
    />
  );
}
