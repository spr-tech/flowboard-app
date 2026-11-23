// Stands in for the dashboard, projects and board screens while they are rebuilt
// (milestones 5 to 8). Each of those routes renders this until its real screen lands.
export default function RebuildingContent() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-3xl font-extrabold tracking-tight">Coming back soon</h1>
      <p className="text-fg-secondary">This part of Flowboard is being rebuilt.</p>
    </section>
  );
}
