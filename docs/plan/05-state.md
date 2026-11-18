# 5. State (RTK Query + Redux)

| Kind of state | Home |
|---|---|
| Server data | RTK Query cache |
| Shareable/bookmarkable (open task, filters) | URL |
| UI only (sidebar, board filters) | `src/stores/uiSlice.ts` |
| Form input | React Hook Form |
| Who is signed in | Auth.js session |

## Setup
- `src/stores/store.ts`: store with the API reducer/middleware and the UI slice; call `setupListeners(store.dispatch)`.
- `src/configs/serviceConfig.ts`: one `createApi`, base URL `/api`, all tag types, `refetchOnFocus: true`, `refetchOnReconnect: true`. Its base query normalises errors to `{ code, message, fields }`, shows the error toast, and redirects to `/login` on 401.
- `src/services/<area>Service.ts`: `injectEndpoints` per area: projects, board, tasks, members/invites, dashboard, account.

## Tag types
`Project`, `Board`, `Member`, `Invite`, `Dashboard`, `Activity`, `Me`.

| Mutation | Invalidates |
|---|---|
| Create / rename / delete project | Project list, Dashboard |
| Add / edit / delete task | that Board, Dashboard, Activity |
| Move task | optimistic (below), then Dashboard, Activity |
| Column changes | that Board |
| Invite / cancel / resend | that project's Invite list |
| Remove member / leave | Member, Board, Project list, Activity |

## Cache settings
| Data | refetchOnMountOrArgChange (s) | keepUnusedDataFor (s) | Polling |
|---|---|---|---|
| Board | 30 | 120 | none |
| Dashboard sections | 30 | 120 | none |
| Activity | 30 | 120 | 30 s, `skipPollingIfUnfocused: true` |
| Projects list | 60 | 300 | none |
| Members / invites | 60 | 300 | none |
| Me | off | 600 | none |

## Optimistic updates (only two)
- **Move task:** in `onQueryStarted`, `updateQueryData` on the board to move the card instantly → `await queryFulfilled` → on success, write the server's position and completedAt into the cache → on failure, `patch.undo()` and show why.
- **Tick a task done on the dashboard:** same pattern.

Everything else waits for the server, with a loading state on the button.
