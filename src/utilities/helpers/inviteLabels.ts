// Words for invites (docs/designs/project-settings.md, "Members"; the invite page).

const DAY_MS = 24 * 60 * 60 * 1000;

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

/**
 * The line under a pending invite: "Sent just now · expires in 7 days", "Sent 2 days ago ·
 * expires in 5 days", or, once it has run out, "Expired. Resend to send a fresh link."
 */
export function inviteNote(invite: { sentAt: string; expiresAt: string }, now: number = Date.now()) {
  const expiresAt = Date.parse(invite.expiresAt);
  if (expiresAt <= now) return { text: "Expired. Resend to send a fresh link.", isExpired: true };

  const sentDaysAgo = Math.max(0, Math.floor((now - Date.parse(invite.sentAt)) / DAY_MS));
  const daysLeft = Math.max(1, Math.ceil((expiresAt - now) / DAY_MS));
  const sent = sentDaysAgo === 0 ? "Sent just now" : `Sent ${days(sentDaysAgo)} ago`;
  return { text: `${sent} · expires in ${days(daysLeft)}`, isExpired: false };
}

/** "ada@team.dev" → "a***@team.dev": enough to recognise an address without showing it. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
