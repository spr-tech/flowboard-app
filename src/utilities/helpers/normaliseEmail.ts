/**
 * Emails are stored and compared trimmed and lowercase, so "Ada@Example.com " and
 * "ada@example.com" are the same account. Use this before every lookup and every save.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
