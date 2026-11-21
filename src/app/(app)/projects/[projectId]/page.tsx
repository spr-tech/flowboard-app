import BoardContent from "@/components/content/board/boardContent";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <BoardContent projectId={projectId} />;
}
