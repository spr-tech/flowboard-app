# Milestone 4 proposal: API core + Redux base

Status: **proposal, not built.** Nothing here is approved until you say so. It assumes milestone 3 (auth, PR from `rebuild-m3-auth`) is merged into `rebuild` first, because it builds on its error helpers, session checks and the temporary auth fetch helper.

From `06-build-order.md`, milestone 4 is: *route-handler wrapper, store, serviceConfig, setupListeners, /api/me*. Done when *a component shows the user's name via RTK Query* (Redux Toolkit Query).

---

## 1. The idea in one paragraph

Today every route handler repeats the same steps by hand, and the browser talks to the API through a small `fetch` helper. Milestone 4 replaces both with one shared path in each direction:

- **Server:** one wrapper that every route handler goes through. It checks the session, validates input with Zod, runs the service, and turns any error into our shape.
- **Browser:** one RTK Query base API. Every request goes through it, and it alone decides what a failed request looks like to the user.

Everything later (projects, board, tasks, dashboard) plugs into these two places. So getting them right now is what keeps milestones 5 to 9 small.

---

## 2. File layout

```
src/
  configs/
    serviceConfig.ts          the one createApi: base URL /api, tag types, defaults, the error-handling base query
    baseQuery.ts              the base query wrapper itself (normalise → toast → 401), kept separate so it is testable alone
  stores/
    store.ts                  makeStore(): API reducer + middleware + ui slice; RootState, AppDispatch types
    storeProvider.tsx         "use client"; creates one store per browser tab, calls setupListeners
    uiSlice.ts                client-only UI state
    hooks.ts                  useAppDispatch, useAppSelector (typed once, used everywhere)
  services/
    accountService.ts         injectEndpoints: getMe (PATCH /api/me arrives with the settings milestone)
    authService.ts            rewritten: register, forgotPassword, verifyResetToken, resetPassword as endpoints
  models/
    responses/meResponses.ts  MeResponse
    responses/apiError.ts     (exists) + the normalised client error type
  utilities/
    enums/apiTags.ts          the tag names
    constants/cacheTimes.ts   the cache table from 05-state.md as named constants
  server/
    lib/route.ts              the route-handler wrapper
    account/account.service.ts   getMe(userId)
  app/
    api/me/route.ts           GET /api/me through the wrapper
    layout.tsx                wraps children in <StoreProvider>
```

New packages: `@reduxjs/toolkit` and `react-redux`. Neither is installed yet; `package.json` lists Redux in the stack, but no milestone has needed it.

**Why `baseQuery.ts` is separate from `serviceConfig.ts`:** the base query is the part with real logic (error mapping, toasts, the 401 redirect). As a plain function it can be tested by calling it directly with a mocked `fetch`, without building a store. `serviceConfig.ts` is then just configuration.

**Why `store.ts` exports `makeStore()`, not a `store`:** see decision 4.1.

---

## 3. The route-handler wrapper (server)

**What it does,** in order: read the session → reject with 401 if required and missing → parse `params`, query string and body with the Zod schemas you give it → call your function → return its result as JSON → turn anything thrown into `{ error: { code, message, fields? } }` via the existing `errorResponse`.

Sketch of how a route would read:

```ts
// src/app/api/me/route.ts
export const GET = route({ auth: true }, ({ user }) => getMe(user.id));

// a later write, for comparison
export const PATCH = route({ auth: true, body: updateMeSchema }, ({ user, body }) => updateMe(user.id, body));
```

### Decision 3.1: a wrapper function, or a try/catch in each handler?
| Option | For | Against |
|---|---|---|
| A. Each handler writes try/catch + session check (today's style) | Nothing hidden | ~15 repeated lines per route; one forgotten session check is a security bug |
| **B. A higher-order function `route(options, handler)`** | Session, validation and error shape can't be forgotten; handlers are one line | One more thing to learn |
| C. Next.js middleware for auth | Central | Middleware runs on the Edge without Prisma, so it can't do our passwordChangedAt check, and it can't validate bodies |

**Recommendation: B.** The rules in CLAUDE.md (thin handlers, one error shape, 404 not 403) only hold if they're enforced in one place. With B, "is this route protected?" is visible in its first line: `auth: true`.

### Decision 3.2: what does 401 mean, and who decides?
`auth()` already runs our jwt callback, which reloads the user and returns no session if the password changed after this session signed in. So the wrapper only has to check `session?.user`. If there's no user: **401 `UNAUTHENTICATED`**, "Your session has ended. Please sign in again." Membership checks (404 for non-members) stay inside services, as the plan says. The wrapper never knows about projects.

### Decision 3.3: Next.js 15 `params` is a Promise
Route handlers in Next 15 receive `params` as a Promise. The wrapper awaits it and runs it through the `params` schema, so handlers get plain, typed values. Without this, every handler would repeat `await` plus a manual check.

---

## 4. The store

### Decision 4.1: one global store, or one store per request?
| Option | For | Against |
|---|---|---|
| A. `export const store = configureStore(...)` at module level | Simplest | On the server, a module is shared by **every request**. A store built there could hold one user's data while rendering another user's page |
| **B. `makeStore()` + create it once inside a client `StoreProvider` with `useRef`** | Redux's official Next.js App Router pattern; no sharing between users | A few more lines |

**Recommendation: B.** It's the setup the Redux docs give for the App Router, for exactly that reason. The provider is a client component, so `useRef` keeps one store per browser tab for the life of the page.

### Decision 4.2: where does the provider go?
In the **root layout**, around `children` (next to `<Toaster />`). The auth forms (register, forgot and reset password) become RTK Query mutations in this milestone, and they live outside the `(app)` group, so the `(app)` layout alone isn't enough. The landing page doesn't use the store, but an empty provider costs almost nothing.

### Decision 4.3: `setupListeners`
`setupListeners(store.dispatch)` is what makes `refetchOnFocus` and `refetchOnReconnect` actually work: it listens for the window regaining focus or the network coming back. It's called once in `StoreProvider`, in an effect that returns its cleanup (React's Strict Mode mounts twice in development, and the cleanup stops double listeners).

### The UI slice
`05-state.md` gives the UI slice "sidebar, board filters". For milestone 4 I'd move only **the mobile menu's open state** (today a `useState` in `appShell.tsx`) into `uiSlice`, so the slice, the typed hooks and their tests exist with one real use. Board filters wait for the board milestone; shareable filters go in the URL anyway.

*Alternative:* leave the menu in `useState` (it's local to one component) and ship an empty slice. I'd rather prove the slice with one real field than ship an empty file.

---

## 5. The base API (`src/configs/serviceConfig.ts`)

```ts
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithErrorHandling, // from baseQuery.ts
  tagTypes: Object.values(ApiTag),
  endpoints: () => ({}),
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 60,
});
```

Each `src/services/<area>Service.ts` calls `baseApi.injectEndpoints(...)`. That's how one base API stays one file while every area adds its own endpoints.

### Decision 5.1: what shape is an error in the browser?
`fetchBaseQuery` returns errors in several shapes: `{ status: 404, data: <our body> }`, `{ status: "FETCH_ERROR" }` (offline), `{ status: "PARSING_ERROR" }` (not JSON, e.g. a Vercel error page). The wrapper turns every one into a single type:

```ts
type AppError = { status: number | "NETWORK"; code: string; message: string; fields?: Record<string, string> };
```

- Our error body → copied across.
- Offline or no answer → `code: "NETWORK_ERROR"`, with today's message ("We couldn't reach Flowboard…").
- Anything else → `code: "UNKNOWN_ERROR"`.

**Why:** screens and forms then check `error.code` and `error.fields` with no `if ("data" in error)` guessing, and the existing `applyApiError` keeps working with a small type change.

### Decision 5.2: who shows the error toast?
CLAUDE.md: *one error wrapper shows error toasts; no catch-with-toast in components.* The open question is forms. A form that shows "Enter a valid email" under the field should **not** also toast it.

| Option | For | Against |
|---|---|---|
| A. Toast every error | Simplest rule | Field errors appear twice (field + toast) |
| B. Never toast; every screen handles its own errors | Full control | Every screen must remember to; one that forgets fails silently. This is what the guide warns against |
| **C. Toast by default, except (1) errors with `fields`, (2) 401, and (3) endpoints that opt out with `extraOptions: { toast: false }`** | Screens get toasts for free; forms keep inline errors | Two exceptions to learn |

**Recommendation: C.**
- Errors with `fields` are by definition about form fields, so the form shows them.
- 401 is handled by a redirect (below), so a toast would only flash before the page changes.
- The auth endpoints opt out entirely, because their screens already show every failure inline. That keeps milestone 3's behaviour exactly.

Toasts use the server's `message`, and an `id` of `error:<code>` so three failing requests show one toast, not three.

### Decision 5.3: the 401 redirect
| Option | For | Against |
|---|---|---|
| A. `router.push("/login")` | Client-side navigation | The base query isn't a component and has no router. Also, the stale session cookie is still there, so middleware would bounce `/login` straight back to `/dashboard`: a loop |
| B. `window.location.assign("/login?callbackUrl=…")` | Simple | Same cookie loop as A |
| **C. `window.location.assign("/auth/session-ended?callbackUrl=<current path>")`** | Reuses milestone 3's route, which clears the cookie with `signOut` and then shows `/login?reason=signed-out`. No loop | Needs one small change: session-ended must pass a safe `callbackUrl` on to `/login` |

**Recommendation: C**, plus a module-level "already redirecting" flag, so five queries failing with 401 at once cause one navigation, not five. A full page load (not a client navigation) is deliberate: it clears the RTK Query cache along with the old session, so no one else's data can stay on screen.

**Why there's no token refresh** (the structure guide describes one): Auth.js keeps the session in an HTTP-only cookie and renews it by itself while the user is active. A 401 here means the session really is over (expired, or the password changed), so refreshing can't help.

### Decision 5.4: tag types
The names from `05-state.md`: `Project`, `Board`, `Member`, `Invite`, `Dashboard`, `Activity`, `Me`.

| Option | For | Against |
|---|---|---|
| A. TypeScript `enum ApiTagsEnum` (the structure guide's example) | Familiar | TS enums generate runtime code and have odd edge cases; the project already avoids enums for `Activity.action` |
| **B. `export const ApiTag = { Project: "Project", … } as const` + a `type ApiTag`** | Plain object, fully typed, `Object.values` gives the list | Slightly less familiar syntax |

**Recommendation: B**, in `src/utilities/enums/apiTags.ts` (the folder CLAUDE.md gives for enums). All seven are registered now; only `Me` is used in milestone 4.

**Why tags matter (the part people get wrong):** a query *provides* tags ("this result is the `Me` data"), and a mutation *invalidates* them ("`Me` just changed"). RTK Query then refetches every query that provided an invalidated tag. The `05-state.md` table lists, for each mutation, every query it can make stale. Forgetting one gives the classic bug: you save, and some other list on screen doesn't change until you reload.

### Decision 5.5: the cache settings from `05-state.md`
Three settings, and what each means:
- **`keepUnusedDataFor`**: how long data stays cached after the last component using it unmounts. Navigate away from a board and back within 120 s, and it shows instantly.
- **`refetchOnMountOrArgChange`**: when a component mounts and cached data is older than this many seconds, refetch in the background (the old data shows meanwhile).
- **`pollingInterval`** (Activity only): refetch every 30 s, with `skipPollingIfUnfocused` so a background tab doesn't poll.

**Recommendation:** put the whole table in `src/utilities/constants/cacheTimes.ts` as named constants (`CACHE.board`, `CACHE.me`, …) and set them **on each endpoint**, not as global defaults. The table differs per kind of data, so per-endpoint is the only place it can live, and named constants keep the numbers in one place. Milestone 4 uses only `CACHE.me`: `keepUnusedDataFor: 600`, no refetch on mount.

**Something I noticed in the table:** `refetchOnFocus: true` is a global default in `05-state.md`, but `Me` says refetch "off". The focus refetch would still fire for `Me` unless that endpoint turns it off too. I'd turn it off for `Me` (your name doesn't change because you switched tabs) and keep it for everything else. Confirm, or tell me the table meant only the mount refetch.

---

## 6. `/api/me` and "a component shows the user's name via RTK Query"

- `GET /api/me` → `{ id, name, email, image, hasPassword }`. `hasPassword` lets the settings page later decide whether to show "change password" (GitHub-only users have none). The service reads it with a Prisma `select`, so the password hash never leaves the service.
- `accountService.getMe` provides tag `Me`.

### Decision 6.1: which component?
| Option | For | Against |
|---|---|---|
| A. A new demo component on the dashboard | Isolated | Throwaway code |
| **B. The user menu in the app shell** | Real use, and the reason for the change: when the settings milestone adds "rename", invalidating `Me` updates the menu with no reload | The shell currently gets the user from the server session |

**Recommendation: B.** The shell keeps receiving the session user from the `(app)` layout, so the first paint has a name with no loading flash. `UserMenu` calls `useGetMeQuery()` and shows `data.name` once it arrives, falling back to the session's name until then. That's not copying query results into state: it reads straight from the cache on every render.

---

## 7. Moving the temporary auth fetch helper onto RTK Query

`src/services/authService.ts` today exports `postJson` and `ApiRequestError`. It becomes `baseApi.injectEndpoints` with:

| Today | Becomes | Why |
|---|---|---|
| `register` | mutation | It changes data |
| `forgotPassword` | mutation | It sends an email |
| `resetPassword` | mutation | It changes data |
| `verifyResetToken` | **query**, `keepUnusedDataFor: 0` | It only reads, and the reset page needs it on load: a query runs itself and gives `isLoading` for free. `0` because a link's state changes once used, so a cached "valid" must never be reused |

All four set `extraOptions: { toast: false }` (decision 5.2), because their screens show every error inline.

Forms then `await registerMutation(values).unwrap()` in a `try`. `unwrap()` throws the normalised `AppError`, and `applyApiError` changes from `instanceof ApiRequestError` to reading `AppError`. `ApiRequestError`, `postJson` and `NETWORK_ERROR_MESSAGE` move or disappear. The user sees no change at all, which is how we'll know it worked.

*Alternative:* leave auth on plain `fetch`, since none of it benefits from caching. I don't recommend it: the structure guide's first rule for the data layer is one tool for every request, and two error paths is how one of them drifts.

---

## 8. Tests

Same rules as now: no network, no database, `fetch` stubbed in each test that needs it, Prisma through `src/test/prismaMock.ts`.

| File | What it proves |
|---|---|
| `server/lib/route.test.ts` | 401 with no session (handler never called) · 400 with field messages from each of the body/params/query schemas · awaited, typed params · `ApiError` → its status and code · unknown error → 500 with no details leaked · success → 200 JSON (201 when asked) |
| `server/account/account.service.test.ts` | `getMe` selects only safe fields; `hasPassword` true and false |
| `app/api/me/route.test.ts` | 401 signed out; 200 with the user signed in |
| `configs/baseQuery.test.ts` | Each `fetchBaseQuery` error shape → `AppError` · toast once per code · no toast for `fields`, 401, or `toast: false` · 401 → one navigation to `/auth/session-ended?callbackUrl=…` even when several fail at once |
| `stores/uiSlice.test.ts` | Menu open/close reducers |
| `services/authService.test.ts` | Each endpoint calls the right URL and method; `unwrap()` errors carry `code` and `fields` |
| `components/layouts/appShell/userMenu.test.tsx` | Shows the session name first, then the `/api/me` name, from a real store with `fetch` mocked |
| existing auth form tests | Still pass after the switch, the proof that nothing changed for users |

---

## 9. What "done" means

1. `GET /api/me` goes through `route()`, and returns 401 when signed out and the user when signed in.
2. The user menu shows the name from `useGetMeQuery` (visible in Redux DevTools as a fulfilled `getMe` query).
3. The register, forgot-password and reset-password flows work exactly as in milestone 3, now through RTK Query; `postJson` is gone.
4. Signed in on two devices, a password reset on one makes the other's next API call land on `/login?reason=signed-out`, with one redirect.
5. A 500 from any non-auth endpoint shows one toast with the server's message.
6. Lint, typecheck, test and build pass locally and in the GitHub Actions `check` run; every new helper has a test next to it.

## 10. Questions for you
1. Decision 5.5: turn `refetchOnFocus` off for `Me`?
2. Decision 4.3: move the mobile menu state into `uiSlice` now, or ship the slice empty?
3. Anything here you want explained further before approving?
