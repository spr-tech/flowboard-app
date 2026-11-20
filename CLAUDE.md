# Flowboard — instructions for Claude Code

Flowboard is a Kanban workspace where a small team (2–10 people) plans a project and moves tasks from idea to done. This repo is being rebuilt on the `rebuild` branch. The full plan lives in `docs/plan/`. Read the plan file for the milestone you are working on before writing code.

## How to work with me
- I am learning. Before writing code for any task, explain your plan and the decisions in it, then wait for me to approve.
- Work one milestone at a time (see `docs/plan/06-build-order.md`). Do not start the next milestone unless I ask.
- After each step, summarise what changed and why, with the full path of every file you touched.
- Spell out abbreviations the first time you use them (for example RTK Query = Redux Toolkit Query).
- Never commit, push, merge or open a pull request unless I ask.

## Structure
Follow `docs/frontendStructureGuide.md` for the frontend. In short:
- `src/app` — routing only; route files render a content component and nothing else.
- `src/components/ui` — generic components, no domain knowledge. Never imports from `content/`.
- `src/components/layouts` — page shells (app shell, auth shell).
- `src/components/content/<feature>/` — feature screens, with `forms/` and `modals/`.
- `src/services` — one RTK Query file per backend area, injected into one base API.
- `src/configs/serviceConfig.ts` — the one base API (`createApi`, base URL `/api`, tag types, error wrapper).
- `src/models/requests`, `src/models/responses`, `src/models/validations` — types and schemas.
- `src/stores` — client-only state (UI slice) and the store setup.
- `src/utilities/hooks`, `enums`, `helpers`, `constants`.

Server code (the backend lives in this same Next.js app for now):
- `src/app/api/**/route.ts` — thin route handlers: read request → check session → validate with Zod → call a service → return.
- `src/server/<feature>/<feature>.service.ts` — all business logic. Route handlers never touch Prisma directly. This keeps a later move to NestJS easy.
- `src/server/lib/` — Prisma client, the route-handler wrapper, error helpers, email sender.

## Departures from the structure guide (agreed for this project)
- Forms use React Hook Form + Zod, not Formik + Yup, so one Zod schema in `src/models/validations/` validates both the form and the API route.
- shadcn components are generated on Radix UI.
- shadcn: we keep clsx + tailwind-merge. After any `shadcn add`, change the generated `cn` import to `@/utilities/helpers/cn` and uninstall any `cn` package it installed. The `text-display-*` classes rely on the custom tailwind-merge setup in `src/utilities/helpers/cn.ts`.

## Database safety
- The old live database (London, separate Neon account) is commented out in `.env`. Never touch it.
- `.env` points at the new Neon project's **dev** branch: `DATABASE_URL` is pooled (the app), `DIRECT_URL` is direct (Prisma CLI: migrations, seed). Never run anything against the new project's production branch; it stays empty until cutover.
- `pnpm db:seed` and `pnpm db:reset` wipe the database. They refuse to run unless `ALLOW_DB_RESET=true` is set, and print the host first. Set it in your local `.env` only, never on Vercel. Always ask before running either.

## Rules
- Colours: role-named tokens from `src/app/globals.css` only. No raw hex or raw Tailwind colours in components.
- Fonts: Bricolage Grotesque for headings, Inter for body.
- Server data lives only in the RTK Query cache. Never copy query results into `useState` or a slice.
- Shareable state (open task, dashboard filters) lives in the URL.
- One error wrapper shows error toasts. No catch-with-toast in components.
- API errors always use the shape `{ error: { code, message, fields? } }`.
- Every write returns the updated object.
- The browser never sends task position numbers. See `docs/plan/03-data-model.md` and `docs/plan/04-api.md`.
- Every service that changes data writes an Activity row in the same transaction (from milestone 5 onward).
- Store only hashes of invite and password-reset tokens.
- Projects a user is not a member of return 404, not 403.
- No `: any`. No files over 400 lines.

## Auth (built in milestone 3)
- Auth.js v5 with JWT (JSON Web Token) sessions. `src/auth.config.ts` is the Edge-safe half (middleware: protected paths, signed-in users sent away from /login, /register, /forgot-password); `src/auth.ts` is the Node half (Prisma adapter, providers, callbacks).
- The token carries our own `authTime` (Auth.js refreshes `iat` whenever it re-issues the cookie). `src/server/auth/sessionToken.ts` reloads the user on every Node-side `auth()` and ends the session if `authTime` is older than `passwordChangedAt`; the app layout then sends the browser to `/auth/session-ended`, which clears the cookie and goes to `/login?reason=signed-out`.
- No automatic account linking: GitHub sign-in with an email that already has a password account lands on `/login?error=OAuthAccountNotLinked` with a "sign in with your email and password" message.
- Links in emails use `APP_URL`, then `VERCEL_BRANCH_URL`, then `http://localhost:3000` in development only; never the request's Host header. `next start` locally needs `APP_URL` in `.env`.
- `pnpm dev` and `next start` share `.next`: don't run both from the same folder at once.

## Testing and CI
- Vitest + Testing Library (jsdom). Config: `vitest.config.mts`; shared setup: `src/test/setup.ts`.
- Name tests `<name>.test.ts(x)` and put them next to the file they test.
- **No network, no database, no `.env` in tests.** Tests must pass anywhere: any laptop, GitHub Actions, any time zone, offline. The setup makes `fetch`, raw sockets, `@/server/lib/prisma` and any new Prisma client throw, and stops `dotenv` loading `.env`; every env value tests need is set in `vitest.config.mts`. Mock Prisma, `fetch` and email senders in the test that needs them. For Prisma, use the typed mock in `src/test/prismaMock.ts`; server tests start with `// @vitest-environment node`. For components and services that use the store, use `renderWithStore`, `mockFetch` and `jsonResponse` from `src/test/renderWithStore.tsx`; for route handlers, mock `@/auth`.
- New API routes go through `route()` in `src/server/lib/route.ts` (see `docs/plan/04-api.md`); new RTK Query endpoints go through `baseApi.injectEndpoints` (see `docs/plan/05-state.md`).
- **Time zone is fixed to America/New_York** (not Lagos), so date code that depends on the machine's zone fails instead of passing by luck. Use fake timers (`vi.useFakeTimers()`, `vi.setSystemTime()`) for anything time-based.
- **Every new service or helper gets a test in the same branch.**
- **Never send real email to addresses that can't receive it** (example.com, example.org, `.test`, `.invalid` and similar) in proofs or end-to-end checks: the bounces hurt the sending Gmail account's reputation. Use `adetoroshina434+<something>@gmail.com`, or mock `sendEmail`.
- CI (`.github/workflows/ci.yml`) runs one job, `check`: install with the frozen lockfile, Prisma generate, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, with dummy env values that point at a host that can't exist. It must pass before merging into `rebuild` or `master`.

## Stack
Next.js (App Router) · React · TypeScript · Redux Toolkit + RTK Query · Prisma + PostgreSQL (Neon) · Auth.js v5 with the Prisma adapter (email + password, GitHub) · Nodemailer over Gmail SMTP for email (`smtp.gmail.com` port 587, STARTTLS with `requireTLS`, certificate checks on; behind `sendEmail` in `src/server/lib/email.ts`, so a later move to Resend changes one file) · dnd-kit · Tailwind CSS v4 · shadcn on Radix UI · React Hook Form + Zod · Vitest + Cypress.

## Git
See `docs/plan/07-git-workflow.md`. Merge with merge commits, never squash, never force-push `master`.
