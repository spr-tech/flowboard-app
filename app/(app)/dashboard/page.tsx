import { getProjects } from "@/app/actions/projects";
import { ListTodo, CircleDot, CheckCircle, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const result = await getProjects();

  const projects = result?.projects;

  const allTasks = projects?.flatMap((project) =>
    project.columns.flatMap((column) => column.tasks)
  );

  const totalProjects = projects?.length;
  const completed = allTasks.filter((t) => t.status === "done").length;
  const inProgress = allTasks.filter((t) => t.status === "inProgress").length;
  const now = new Date();
  const overDue = allTasks.filter(
    (t) =>
      t.dueDate !== null && new Date(t.dueDate) < now && t.status !== "done"
  ).length;

  return (
    <>
      <div>
        {/* cards */}
        <section className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          {/* Total projects*/}
          <div className="flex flex-col gap-2">
            <ListTodo size={20} />
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <p className="text-2xl font-medium text-[#111827] mt-1">
                {totalProjects}
              </p>
              <p className="text-xs text-[#6B7280]">Total projects</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
