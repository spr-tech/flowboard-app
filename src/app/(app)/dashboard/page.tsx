import type { Metadata } from "next";

import DashboardContent from "@/components/content/dashboard/dashboardContent";
import { toDashboardFilter } from "@/utilities/helpers/dashboardFilter";
import { searchParam, type SearchParams } from "@/utilities/helpers/searchParam";

export const metadata: Metadata = { title: "Dashboard · Flowboard" };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <DashboardContent filter={toDashboardFilter(searchParam(params, "filter"))} />;
}
