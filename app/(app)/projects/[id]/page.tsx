export default async function ProjectBoardPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Project Board</h1>
      <p>Project ID: {params.id}</p>
    </div>
  );
}
