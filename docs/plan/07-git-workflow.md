# 7. Git workflow and cutover

## Branches
- `master`: the live app. Every change reaches it through a pull request.
- One short-lived branch per change, made from the latest `master` and opened as a PR into `master`: `feature-<name>` for new features (`feature-email-verification`), `fix-<name>` for bug fixes, `chore-<name>` for tooling and docs. Hyphens, not slashes.
- `rebuild` is retired. The rebuild went live through it (PR #23); don't branch from it or open PRs into it. The old `rebuild-mN-<name>` branches are history.

## Merging
- Always "Create a merge commit". Never squash (squashed commits lose their own dates and contribution-graph credit). Never force-push `master`.
- CI's `check` job must pass before merging into `master`.
- Check that `git config user.email` matches an email on your GitHub account.

## Database migrations
Migrations are add-only where possible (new tables, new nullable columns), so the code running before and after a deploy both work with the new schema.

1. Apply the migration to the Neon **dev** branch while building the change (`pnpm prisma migrate dev`, which uses `DIRECT_URL` from `.env`).
2. **Before merging the PR into `master`**, apply it to the **production** branch from a laptop, giving the production direct URL to that one command only, so `.env` keeps pointing at dev: `DIRECT_URL="<production direct URL>" pnpm prisma migrate deploy`. If the code deploys first, anything touching the new table fails on the live site.
3. Merge. Vercel deploys.

Never seed or reset the production branch.

## Environments
- Neon: the app uses the Neon project in Frankfurt. Its **dev** branch is used locally and by the Vercel *preview* environment (`DATABASE_URL` pooled for the app, `DIRECT_URL` direct for migrations). Its **production** branch is the live database, used by Vercel *production*.
- GitHub sign-in on previews: a second GitHub OAuth app, whose callback uses one fixed Vercel branch domain (it was set up for `rebuild`), so GitHub sign-in only works on previews served from that domain; set `AUTH_TRUST_HOST=true`. Preview sets `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` (the preview app), `AUTH_TRUST_HOST`, `EMAIL_USER` and `EMAIL_PASS` for all Preview deployments, so email and password work on every branch preview. Email links on previews use `VERCEL_BRANCH_URL` unless `APP_URL` is set.
- Email: `EMAIL_USER` is the Gmail address and `EMAIL_PASS` a Google App Password (needs 2-Step Verification), sent over port 587 with STARTTLS. Antivirus "mail shields" that intercept SMTP on a laptop break local sending; fix that in the antivirus, never by turning off certificate checks.
- Locally, `next start` (production mode) needs `APP_URL=http://localhost:3000` in `.env`; `pnpm dev` falls back to localhost by itself.

## Cutover day (done)
Kept as a record: the rebuild is live, merged into `master` through PR #23.

A fresh start: the rebuild begins with an empty database on the new Neon project (Frankfurt). **No data is copied** from the old live database (London, separate Neon account); it only holds test data. Anyone using the old app makes a new account after cutover.

The old London database is never migrated, written to or deleted on cutover day. It stays untouched as the rollback for a few weeks, then gets deleted (see "After the rollback window" below).

Step by step, with every Production variable and where its value comes from: [`docs/cutover-checklist.md`](../cutover-checklist.md). In short:

1. Write down the current Production values of `DATABASE_URL` and `DIRECT_URL` (the London ones) somewhere safe, such as a password manager. They are the rollback.
2. `prisma migrate deploy` against the **empty Frankfurt production branch**, from a laptop, with its direct URL given for that one command only. Never seed it, and never run `db:seed` or `db:reset` against it.
3. Set Vercel's Production variables for the new app (database, auth secret, GitHub OAuth app, email, `APP_URL`). `APP_URL` is the live domain: links in emails are built from it, never from the request's Host header.
4. Merge `rebuild` into `master` with a merge commit. Vercel deploys.
5. Test on production: register, email sign in, GitHub sign in, password reset email, create a project, open a board, drag a card, invite someone (to a real address you own).

## Rollback
Vercel instant rollback to the last old deployment **and** point Production's `DATABASE_URL` and `DIRECT_URL` back to the London values from step 1, then redeploy that old deployment so it picks them up. Code and database go back together. Anything created in the new app after cutover stays in Frankfurt and doesn't appear in the old app.

## After the rollback window
After a few weeks with no rollback:

1. Remove the old app's leftover Production variables from Vercel (anything the new app doesn't read, such as `NEXTAUTH_SECRET` or `NEXTAUTH_URL`).
2. Delete the old London database (and its Neon account, if nothing else uses it).
