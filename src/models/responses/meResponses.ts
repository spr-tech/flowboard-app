/** GET /api/me: the signed-in user. */
export type MeResponse = {
  id: string;
  name: string | null;
  /** Always lowercase. */
  email: string;
  image: string | null;
  /** False for GitHub-only accounts, which have no password to change. */
  hasPassword: boolean;
  /** True once the email is confirmed (a code, the email's link, an accepted invite, or GitHub). */
  emailVerified: boolean;
};
