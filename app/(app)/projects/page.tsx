import { getProjects } from "@/app/actions/projects";

export default function ProjectPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium text-[#111827]">My projects</h1>
      <p className="text-[#6B7280] text-sm mt-1">
        All projects you own or are a memeber of{" "}
      </p>
    </div>
  );
}
