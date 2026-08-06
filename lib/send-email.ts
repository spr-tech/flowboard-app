import { transporter } from "./nodemailer";

type InviteEmailProps = {
  to: string;
  projectName: string;
  invitedBy: string;
};

export async function sendInviteEmail({
  to,
  projectName,
  invitedBy,
}: InviteEmailProps) {
  const info = await transporter.sendMail({
    from: `"FlowBoard" <${process.env.EMAIL_USER}>`,
    to,
    subject: `You've been invited to ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>You're invited!</h2>

        <p><strong>${invitedBy}</strong> has invited you to collaborate on the project:</p>

        <h3>${projectName}</h3>

        <p>Login to FlowBoard to start collaborating.</p>

        <br/>

        <p>— FlowBoard</p>
      </div>
    `,
  });

  console.log(info);
}
