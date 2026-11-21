# 5. State (RTK Query + Redux)

| Kind of state | Home |
|---|---|
| Server data | RTK Query cache |
| Shareable/bookmarkable (open task, filters) | URL |
| UI only (mobile menu; board filters later) | `src/stores/uiSlice.ts` |
| Form input | React Hook Form |
| Who is signed in | Auth.js session |

## Setup (built in milestone 4)
- `src/stores/store.ts`: `makeStore()`, never a module-level store. On the server one module is shared by every request, so a single store could hold one user's data while rendering another's page. `combineSlices(uiSlice, baseApi)` plus the API middleware.
- `src/stores/storeProvider.tsx`: client component in the root layout (the auth screens use the store too, and they're outside the `(app)` group). One store per browser tab via a lazy `useState(makeStore)`; the Redux docs use `useRef`, but React's lint rules forbid reading a ref during render, and the lazy initialiser also runs once. Calls `setupListeners(store.dispatch)` in an effect and returns its cleanup, which is what makes `refetchOnFocus` / `refetchOnReconnect` work.
- `src/stores/hooks.ts`: `useAppDispatch`, `useAppSelector`, typed once.
- `src/configs/serviceConfig.ts`: the one `createApi` (`reducerPath: "api"`, base URL `/api`, all tag types, `refetchOnFocus: true`, `refetchOnReconnect: true`, default `keepUnusedDataFor: 60`). One API, because tags can only invalidate queries in the same API.
- `src/configs/baseQuery.ts`: `createBaseQuery()` wraps `fetchBaseQuery` (see "Errors" below). Kept apart from `serviceConfig.ts` so it can be tested by calling it directly with a mocked `fetch`.
- `src/services/<area>Service.ts`: `baseApi.injectEndpoints` per area: account, auth, then projects, board, tasks, members/invites, dashboard. Each URL is built from one `controller` constant. Components call the service's own hook (`useMe()`, `useResetTokenState()`) when an endpoint has subscription settings, so those settings apply everywhere.

## Errors
Every failed request becomes one `AppError` (`src/models/responses/apiError.ts`): `{ status: number | "NETWORK", code, message, fields? }`.
- Our error body → copied across. No answer (offline, timeout) → `NETWORK_ERROR` with "We couldn't reach Flowboard…". Anything else (a hosting error page that isn't JSON) → `UNKNOWN_ERROR`.
- `.unwrap()` throws the `AppError`, so forms check `error.code` and `error.fields` directly (`applyApiError`, `isAppError` in `src/utilities/helpers/applyApiError.ts`).

**Toasts:** the base query shows the error toast, with the server's own message and the id `error:<code>` (three failing requests show one toast). Components never catch-and-toast. No toast when:
- the error has `fields`: it's about form fields, so the form shows it;
- the status is 401: the page is about to change (below);
- the endpoint sets `extraOptions: { toast: false }`: its screen shows every failure inline. All auth endpoints do this.

**401:** a full page load (not a client navigation) to `/auth/session-ended?callbackUrl=<current page>`, once, however many requests fail together. That route clears the dead cookie with `signOut` (otherwise middleware would bounce `/login` back to `/dashboard`) and goes to `/login?reason=signed-out&callbackUrl=…`, keeping only same-site paths. The full load also empties the cache, so nothing from the ended session stays on screen. There's no token refresh: Auth.js renews the cookie by itself while the user is active, so a 401 means the session really is over.

## Tag types
`Project`, `Board`, `Member`, `Invite`, `Dashboard`, `Activity`, `Me`: an `as const` object in `src/utilities/enums/apiTags.ts` (no TypeScript enum), all registered in `createApi`.

A query *provides* tags; a mutation *invalidates* them; RTK Query refetches every query that provided an invalidated tag. When writing a mutation, list every query that could now be out of date.

| Mutation | Invalidates |
|---|---|
| Create / rename / delete project | Project list, Dashboard |
| Add / edit / delete task | that Board, Dashboard, Activity |
| Move task | optimistic (below), then Dashboard, Activity |
| Column changes | that Board |
| Invite / cancel / resend | that project's Invite list |
| Remove member / leave | Member, Board, Project list, Activity |
| Rename me (settings) | Me |

## Cache settings
In `src/utilities/constants/cacheTimes.ts` as `CACHE.<kind>`. RTK Query accepts `keepUnusedDataFor` per endpoint, but the refetch options only API-wide or per subscription (the options given to a `use…Query` hook). So each entry has an `endpoint` part (spread into the endpoint definition) and a `subscription` part (passed by the service's hook).

| Data | refetchOnMountOrArgChange (s) | keepUnusedDataFor (s) | Polling |
|---|---|---|---|
| Board | 30 | 120 | none |
| Dashboard sections | 30 | 120 | none |
| Activity | 30 | 120 | 30 s, `skipPollingIfUnfocused: true` (`ACTIVITY_POLLING`) |
| Projects list | 60 | 300 | none |
| Members / invites | 60 | 300 | none |
| Me | off, and no refetch on focus either | 600 | none |
| Reset-link check (`verifyResetToken`) | every mount, not on focus | 0 (never reused: a link's state changes once used) | none |

- `keepUnusedDataFor`: how long data stays cached after the last component using it unmounts.
- `refetchOnMountOrArgChange`: when a component mounts and cached data is older than this, refetch in the background while the cached data shows.

## Optimistic updates (only two)
- **Move task:** in `onQueryStarted`, `updateQueryData` on the board to move the card instantly → `await queryFulfilled` → on success, write the server's position and completedAt into the cache → on failure, `patch.undo()` and show why.
- **Tick a task done on the dashboard:** same pattern.

Everything else waits for the server, with a loading state on the button.

## Testing the data layer
- `src/test/renderWithStore.tsx`: `renderWithStore(ui)` (a fresh store per test, so no cached query leaks), `mockFetch(handler)` and `jsonResponse(status, body)`.
- The test setup resolves relative `Request` URLs against the page address, as a browser does, so tests use the real `/api` base URL.
