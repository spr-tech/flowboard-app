# 7. Git workflow and cutover

## Branches
- `master`: the live app, frozen except urgent fixes. If you fix something on `master`, merge `master` into `rebuild` straight away.
- `rebuild`: the new app comes together here.
- `rebuild-mN-<name>`: one per milestone (`rebuild-m1-foundation`, `rebuild-m2-database`, ...), PR into `rebuild`. Hyphens, not slashes: a `rebuild/...` branch can't coexist with the `rebuild` branch, because Git stores `rebuild` as a file and `rebuild/...` would need it to be a folder.

## Merging
- Always "Create a merge commit". Never squash (squashed commits lose their own dates and contribution-graph credit). Never force-push `master`.
- Check that `git config user.email` matches an email on your GitHub account.

## Environments
- Neon: the rebuild uses a new Neon project (Frankfurt). Its **dev** branch is used locally and by the Vercel *preview* environment (`DATABASE_URL` pooled for the app, `DIRECT_URL` direct for migrations). Its **production** branch stays empty until cutover. Vercel *production* keeps using the old London database until then. Never run rebuild migrations against either production database.
- GitHub sign-in on previews: a second GitHub OAuth app whose callback uses the fixed Vercel branch domain for `rebuild`; set `AUTH_TRUST_HOST=true`. Preview sets `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` (the preview app), `AUTH_TRUST_HOST`, `EMAIL_USER` and `EMAIL_PASS` for all Preview deployments, so email and password work on every milestone preview; GitHub sign-in only works on the `rebuild` preview. Email links on previews use `VERCEL_BRANCH_URL` unless `APP_URL` is set.
- Email: `EMAIL_USER` is the Gmail address and `EMAIL_PASS` a Google App Password (needs 2-Step Verification), sent over port 587 with STARTTLS. Antivirus "mail shields" that intercept SMTP on a laptop break local sending; fix that in the antivirus, never by turning off certificate checks.
- Locally, `next start` (production mode) needs `APP_URL=http://localhost:3000` in `.env`; `pnpm dev` falls back to localhost by itself.

## Cutover day
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
