import type { Metadata } from "next";

import ProjectsContent from "@/components/content/projects/projectsContent";
import { toProjectFilter } from "@/utilities/helpers/projectOrder";
import { searchParam, type SearchParams } from "@/utilities/helpers/searchParam";

export const metadata: Metadata = { title: "Projects · Flowboard" };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <ProjectsContent filter={toProjectFilter(searchParam(params, "filter"))} />;
}
