# 7. Git workflow and cutover

## Branches
- `main`: the live app, frozen except urgent fixes. If you fix something on `main`, merge `main` into `rebuild` straight away.
- `rebuild`: the new app comes together here.
- `rebuild/mN-<name>`: one per milestone, PR into `rebuild`.

## Merging
- Always "Create a merge commit". Never squash (squashed commits lose their own dates and contribution-graph credit). Never force-push `main`.
- Check that `git config user.email` matches an email on your GitHub account.

## Environments
- Neon: a `rebuild` database branch. The Vercel *preview* environment uses it as `DATABASE_URL`. Never run rebuild migrations against production.
- GitHub sign-in on previews: a second GitHub OAuth app whose callback uses the fixed Vercel branch domain for `rebuild`; set `AUTH_TRUST_HOST=true`.

## Cutover day
1. Back up: create a Neon branch from production (the restore point).
2. `prisma migrate deploy` on production, then the one-off data script (skip it if production only has test data): ownerId → OWNER member rows; the "Done" (or last) column gets isDone; re-space positions; set completedAt for tasks in the done column.
3. Merge `rebuild` into `main` with a merge commit. Vercel deploys.
4. Test on production: email sign in, GitHub sign in, open a board, drag a card.

## Rollback
Vercel instant rollback **and** restore the database from the backup branch. Code and database go back together.
