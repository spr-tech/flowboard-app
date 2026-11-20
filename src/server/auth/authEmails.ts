import type { EmailMessage } from "@/server/lib/email";
import { renderEmailHtml, renderEmailText } from "@/server/lib/emailLayout";

type Recipient = { email: string; name: string | null };

function greeting(name: string | null): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `Hi ${firstName},` : "Hi,";
}

/** The reset link. Valid for one hour and one use. */
export function resetPasswordEmail(to: Recipient, resetUrl: string): EmailMessage {
  const content = {
    preview: "Use this link within an hour to choose a new password.",
    heading: "Reset your password",
    paragraphs: [
      greeting(to.name),
      "Someone asked to reset the password for your Flowboard account. Choose a new one with the button below. The link works once and expires in 1 hour.",
    ],
    button: { label: "Choose a new password", url: resetUrl },
    footnote: "If you didn't ask for this, ignore this email. Your password stays the same.",
  };
  return { to: to.email, subject: "Reset your Flowboard password", html: renderEmailHtml(content), text: renderEmailText(content) };
}

/** For accounts with no password: they sign in with GitHub, so there's nothing to reset. */
export function githubSignInEmail(to: Recipient, loginUrl: string): EmailMessage {
  const content = {
    preview: "Your account uses GitHub to sign in.",
    heading: "Sign in with GitHub",
    paragraphs: [
      greeting(to.name),
      "Someone asked to reset the password for your Flowboard account, but your account doesn't have a password: you sign in with GitHub.",
      "Use \"Continue with GitHub\" on the sign-in page.",
    ],
    button: { label: "Go to sign in", url: loginUrl },
    footnote: "If you didn't ask for this, you can ignore this email.",
  };
  return { to: to.email, subject: "How to sign in to Flowboard", html: renderEmailHtml(content), text: renderEmailText(content) };
}
