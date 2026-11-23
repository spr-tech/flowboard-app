// The invite email: "<inviter> invited you to <project>", the project's description when it has
// one, and a "Join <project>" button. renderEmailHtml escapes every value it's given.
import type { EmailMessage } from "@/server/lib/email";
import { renderEmailHtml, renderEmailText } from "@/server/lib/emailLayout";

type InviteEmailInput = {
  to: string;
  inviterName: string;
  projectName: string;
  description: string | null;
  joinUrl: string;
};

export function inviteEmail({ to, inviterName, projectName, description, joinUrl }: InviteEmailInput): EmailMessage {
  const content = {
    preview: `Join ${projectName} on Flowboard.`,
    heading: `${inviterName} invited you to ${projectName}`,
    paragraphs: [
      `${inviterName} would like you to join ${projectName} on Flowboard, a shared board for planning work and moving tasks from idea to done.`,
      ...(description ? [`About the project: ${description}`] : []),
    ],
    button: { label: `Join ${projectName}`, url: joinUrl },
    footnote: "The link works for 7 days. If you weren't expecting this, you can ignore this email.",
  };
  return {
    to,
    subject: `${inviterName} invited you to ${projectName}`,
    html: renderEmailHtml(content),
    text: renderEmailText(content),
  };
}
