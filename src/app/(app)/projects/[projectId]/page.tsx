import type { Metadata } from "next";

import BoardContent from "@/components/content/board/boardContent";
import { projectNameOrNotFound } from "@/server/projects/projectPage";

type Props = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  return { title: (await projectNameOrNotFound(projectId)) ?? "Project" };
}

export default async function Page({ params }: Props) {
  const { projectId } = await params;
  await projectNameOrNotFound(projectId);
  return <BoardContent projectId={projectId} />;
}
