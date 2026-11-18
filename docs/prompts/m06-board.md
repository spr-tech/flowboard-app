Read CLAUDE.md, docs/plan/03-data-model.md, docs/plan/04-api.md (Columns, Tasks, Moving a task), docs/plan/05-state.md (optimistic updates) and docs/plan/01-product-and-flows.md (column delete decision).

Milestone 6: Board and tasks.
- Column and task services and routes. Column changes are owner-only.
- The move endpoint exactly as described: the browser sends neighbours, the server computes the position, sets/clears completedAt, writes Activity, re-spaces when needed.
- Vitest unit tests for the position calculation: between, top, bottom, empty column, re-space.
- Board page with dnd-kit; moveTask is optimistic with undo on failure.
- Quick add ("+ Add task", Enter), task drawer driven by ?task= in the URL, column settings, and the delete-column dialog (move tasks, or type the name).

This is the biggest milestone. Explain the plan in steps, wait for my approval, then do one step at a time.
