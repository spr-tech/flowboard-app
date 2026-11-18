Read CLAUDE.md, docs/plan/04-api.md (Conventions) and docs/plan/05-state.md.

Milestone 4: API core and Redux base.
- A route-handler wrapper in src/server/lib that does the session check, Zod validation and error shaping ({ error: { code, message, fields? } }) so no handler repeats it.
- The store (src/stores/store.ts) with setupListeners, the base API in src/configs/serviceConfig.ts with tag types, refetchOnFocus/refetchOnReconnect, the error wrapper (toast + 401 redirect), and the UI slice.
- GET/PATCH /api/me, an accountService, and a component that shows the user's name through RTK Query.

Explain first and wait for my approval.
