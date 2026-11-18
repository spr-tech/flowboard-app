Read CLAUDE.md, docs/plan/01-product-and-flows.md (forgot password decisions), docs/plan/04-api.md (Auth section) and docs/plan/03-data-model.md.

Milestone 3: Auth.
- Auth.js v5 with the Prisma adapter: email + password (bcryptjs) and GitHub. GitHub sign-in must create a real User row.
- Register endpoint with server-side Zod validation.
- Middleware protecting every app route (/dashboard, /projects, /settings).
- Sessions issued before User.passwordChangedAt are treated as signed out.
- Forgot/reset password with Resend: hashed single-use tokens, 1-hour expiry, older tokens cancelled, same response whether the email exists, GitHub-only users get a "sign in with GitHub" email, max 3 per address per hour.
- Build the sign-in, sign-up, forgot and reset pages functionally (simple styling is fine; full designs come in milestone 10).

Explain your plan first and wait for my approval.
