import { getProjects } from "@/app/actions/projects";
import { getCurrentUser } from "@/lib/get-current-user";
import { ListTodo, CircleDot, CheckCircle, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const result = await getProjects();
  const user = await getCurrentUser();
  const userName = user?.name;

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
        {/* greetings */}
        <div className="mb-6">
          <p className="text-gray-800 font-semibold ">Welcome {userName},</p>
          <span className="text-[12px] text-gray-700">
            Here&apos;s what&apos;s happening across your projects today.
          </span>
        </div>

        {/* cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total projects card*/}
          <div className="bg-white shadow-md rounded-lg p-5 flex justify-between items-start">
            <span className="bg-[#EDE9FE] p-2 rounded-lg">
              <ListTodo size={20} className="text-[#7C3AED]" />
            </span>

            <div className="flex flex-col gap-2 items-center">
              <span className="text-slate-500 text-sm font-medium">
                Total projects
              </span>
              <span className="text-2xl font-bold text-slate-600">
                {totalProjects}
              </span>
            </div>
          </div>

          {/* Inprogress  */}
          <div className="bg-white shadow-md rounded-lg p-5 flex justify-between items-start">
            <span className="bg-[#FEF3C7] p-2 rounded-lg">
              <CircleDot size={20} className="text-[#F59E0B]" />
            </span>

            <div className="flex flex-col gap-2 items-center">
              <span className="text-slate-500 text-sm font-medium">
                In Progress
              </span>
              <span className="text-2xl font-bold text-slate-600">
                {inProgress}
              </span>
            </div>
          </div>

          {/* completed */}
          <div className="bg-white shadow-md rounded-lg p-5 flex justify-between items-start">
            <span className="bg-[#D1FAE5] p-2 rounded-lg">
              <CheckCircle size={20} className="text-[#10B981]" />
            </span>

            <div className="flex flex-col gap-2 items-center">
              <span className="text-slate-500 text-sm font-medium">
                Completed
              </span>
              <span className="text-2xl font-bold text-slate-600">
                {completed}
              </span>
            </div>
          </div>

          {/* Overdue */}

          <div className="bg-white shadow-md rounded-lg p-5 flex justify-between items-start">
            <span className="bg-[#FEE2E2] p-2 rounded-lg">
              <AlertCircle size={20} className="text-[#EF4444]" />
            </span>

            <div className="flex flex-col gap-2 items-center">
              <span className="text-slate-500 text-sm font-medium">
                Overdue
              </span>
              <span className="text-2xl font-bold text-slate-600">
                {overDue}
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
