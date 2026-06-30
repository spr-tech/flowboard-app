import { createProject } from "@/app/actions/createProjects";

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

// ─── FUNCTION ──────────────────────────────────────────────────────────────
// TestPage
//    — a throwaway page used only to manually test our Server Actions
//      before we build the real UI. safe to delete once testing is done
//
// async function handleCreate()
//    — a function defined directly inside TestPage
//
// "use server" (inside handleCreate, not at the top of the file)
//    — this is called an inline Server Action
//    — it marks only THIS one function as a Server Action, not the
//      whole file
//    — this is different from app/actions/projects.ts where "use server"
//      sits at the very top and marks every function in that file
//    — we need this here because TestPage itself is a Server Component,
//      but a <form> still needs a function it can call when the browser
//      submits it. the inline "use server" creates that bridge between
//      a browser form submission and code running back on the server
//
// const result = await createProject({ name: "My First Test Project" })
//    — calls the real createProject Server Action we built earlier
//    — passes a hardcoded test name since this is just for testing,
//      not real user input
//
// console.log(result)
//    — because handleCreate runs entirely on the server, this log
//      does NOT appear in the browser's dev tools console
//    — it appears in your TERMINAL, wherever pnpm dev is running
//    — this is the single most important thing to remember when
//      debugging server-side code: server logs go to the terminal,
//      client logs go to the browser console
//
// <form action={handleCreate}>
//    — the action prop on a form is how you connect a Server Action
//      to a form submission
//    — when the button is clicked, the browser submits the form,
//      which triggers handleCreate to run on the server
//
// WHY THIS PAGE EXISTS
//    — there is no real UI yet for creating projects (no modal, no
//      proper form with validation)
//    — this lets us confirm createProject actually works correctly
//      against the real database before spending time building the
//      polished UI around it
//    — once confirmed working, this entire app/test/ folder can be
//      safely deleted