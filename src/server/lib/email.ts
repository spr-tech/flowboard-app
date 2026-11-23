// The only place that sends email. Today: Nodemailer over Gmail SMTP (no verified domain needed).
// To move to Resend or another provider later, change only this file.
import nodemailer, { type Transporter } from "nodemailer";

export type EmailMessage = {
  to: string;
  subject: string;
  /** Every user-supplied value inside must already be escaped (see escapeHtml). */
  html: string;
  /** Plain-text version, for mail apps that don't show HTML and for spam filters. */
  text: string;
};

// Nodemailer's defaults wait up to 10 minutes on a stalled connection, so a broken send looks
// like silence. These make it fail within seconds, with an error we log.
const SMTP_TIMEOUTS_MS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

let transporter: Transporter | undefined;

// Port 587 starts plain and upgrades with STARTTLS. requireTLS refuses to send if that upgrade
// fails, so mail never goes out unencrypted; certificate checks stay on (Nodemailer's default).
const GMAIL_SMTP = { host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true };

function getTransporter(user: string, pass: string): Transporter {
  // EMAIL_PASS is a Google "App password", not the account's normal password.
  transporter ??= nodemailer.createTransport({ ...GMAIL_SMTP, auth: { user, pass }, ...SMTP_TIMEOUTS_MS });
  return transporter;
}

/** Sends one email. Logs the outcome either way, and throws if it wasn't sent. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    // Production (Vercel previews included) must be able to send; locally, print it instead.
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_USER and EMAIL_PASS must be set to send email.");
    }
    console.info(
      `[email] EMAIL_USER/EMAIL_PASS not set, so this was not sent.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`
    );
    return;
  }

  try {
    const info = await getTransporter(user, pass).sendMail({
      from: { name: "Flowboard", address: user },
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    console.info("[email] sent", {
      subject: message.subject,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    if (info.rejected.length > 0) {
      throw new Error(`The mail server rejected: ${info.rejected.join(", ")}`);
    }
  } catch (error) {
    console.error(`[email] NOT sent: "${message.subject}"`, error);
    throw error;
  }
}
