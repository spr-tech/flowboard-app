/**
 * The address people write to about their account (privacy and terms pages). It's the Gmail
 * account Flowboard sends from (EMAIL_USER), read when the page is built. Null when it isn't set,
 * so the page shows a placeholder instead of an empty link.
 */
export function supportEmail(): string | null {
  return process.env.EMAIL_USER?.trim() || null;
}
