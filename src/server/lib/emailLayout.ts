// The branded frame every Flowboard email shares: cream page, white card, espresso text,
// vermilion button. Tables and inline styles because that's what email apps reliably render.
import { escapeHtml } from "./escapeHtml";

/**
 * Raw hex on purpose: email apps don't support CSS variables, so the role tokens in
 * src/app/globals.css can't be used here. Keep these in step with the brand values there.
 */
const EMAIL_COLOURS = {
  page: "#fbf5ee", // --brand-cream
  card: "#ffffff", // --brand-white
  border: "#eadfd3", // --brand-sand
  codeBox: "#fbf5ee", // --brand-cream
  text: "#1e1512", // --brand-espresso
  muted: "#7a675d", // --brand-mocha
  button: "#d23f27", // --brand-vermilion
  buttonText: "#ffffff", // --brand-white
} as const;

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type EmailLayout = {
  /** Shown in the inbox list after the subject. Plain text; escaped here. */
  preview: string;
  heading: string;
  /** Paragraphs of plain text; each is escaped here. */
  paragraphs: string[];
  /** A one-time code, shown large and spaced out under the paragraphs, with a note under it. */
  code?: { value: string; note: string };
  /** A line just above the button (e.g. "Or confirm with the button instead."). Plain text; escaped here. */
  buttonIntro?: string;
  button?: { label: string; url: string };
  /** Small print under the button. Plain text; escaped here. */
  footnote?: string;
};

const MONO_FONT = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

export function renderEmailHtml({
  preview,
  heading,
  paragraphs,
  code,
  buttonIntro,
  button,
  footnote,
}: EmailLayout): string {
  const c = EMAIL_COLOURS;
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${c.text};">${escapeHtml(text)}</p>`;
  const body = paragraphs.map(paragraph).join("");
  // letter-spacing spreads the digits for reading; the code is one text run, so copying it gives "123456".
  const codeHtml = code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:${c.codeBox};border:1px solid ${c.border};border-radius:14px;padding:16px 24px;">
<span style="font-family:${MONO_FONT};font-size:36px;line-height:44px;font-weight:700;letter-spacing:10px;color:${c.text};">${escapeHtml(code.value)}</span>
</td></tr></table>
<p style="margin:-12px 0 24px;font-size:14px;line-height:20px;color:${c.muted};">${escapeHtml(code.note)}</p>`
    : "";
  const buttonIntroHtml = buttonIntro ? paragraph(buttonIntro) : "";
  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:${c.button};">
<a href="${escapeHtml(button.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:${c.buttonText};text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${c.muted};">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(button.url)}" style="color:${c.text};word-break:break-all;">${escapeHtml(button.url)}</a></p>`
    : "";
  const footnoteHtml = footnote
    ? `<p style="margin:0;font-size:13px;line-height:20px;color:${c.muted};">${escapeHtml(footnote)}</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${c.page};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 8px 20px;font-size:20px;font-weight:700;color:${c.text};">Flowboard</td></tr>
<tr><td style="background:${c.card};border:1px solid ${c.border};border-radius:20px;padding:32px;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:30px;color:${c.text};">${escapeHtml(heading)}</h1>
${body}${codeHtml}${buttonIntroHtml}${buttonHtml}${footnoteHtml}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:${c.muted};">You're getting this because someone used this address on Flowboard.</td></tr>
</table></td></tr></table>
</body></html>`;
}

/** The same content as plain text. */
export function renderEmailText({ heading, paragraphs, code, buttonIntro, button, footnote }: EmailLayout): string {
  return [
    heading,
    ...paragraphs,
    code ? `${code.value}\n${code.note}` : "",
    buttonIntro ?? "",
    button ? `${button.label}: ${button.url}` : "",
    footnote ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
