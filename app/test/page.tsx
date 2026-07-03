import { createProject } from "@/app/actions/projects";

export default function TestPage() {
  async function handleCreate() {
    "use server";
    const result = await createProject({ name: "My First Test Project" });
    console.log(result);
  }

  return (
    <form action={handleCreate}>
      <button type="submit">Create Test Project</button>
    </form>
  );
}
