import type { Metadata } from "next";

import SignUpContent from "@/components/content/auth/signUpContent";
import { searchParam, type SearchParams } from "@/utilities/helpers/searchParam";

export const metadata: Metadata = { title: "Create your account · Flowboard" };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <SignUpContent callbackUrl={searchParam(params, "callbackUrl")} />;
}
