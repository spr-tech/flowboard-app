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
- GitHub sign-in on previews: a second GitHub OAuth app whose callback uses the fixed Vercel branch domain for `rebuild`; set `AUTH_TRUST_HOST=true`.

## Cutover day
The rebuild starts from a fresh `init` migration on a new Neon project (Frankfurt). The old live database (London, separate Neon account) is never migrated in place; it stays untouched as the fallback.

1. Back up: create a Neon branch of the old London database (the restore point), and make no changes to it.
2. `prisma migrate deploy` on the **empty Frankfurt production branch**. Never seed it.
3. Copy data across, only if the old database has data worth keeping (skip if it only has test data). A one-off script reads London and writes Frankfurt: lowercase emails; password → passwordHash; ownerId → OWNER ProjectMember rows, old Member rows → MEMBER; hex colour → nearest colour key; the "Done" (or last) column gets isDone; re-space column and task positions; set Task.projectId and createdById (the project owner); set completedAt for tasks in the done column.
4. Point Vercel's Production `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) at the Frankfurt production branch.
5. Merge `rebuild` into `master` with a merge commit. Vercel deploys.
6. Test on production: email sign in, GitHub sign in, open a board, drag a card.

## Rollback
Vercel instant rollback **and** point Production's database variables back to the old London database. Code and database go back together.
