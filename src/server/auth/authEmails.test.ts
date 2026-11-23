// @vitest-environment node
import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/server/lib/escapeHtml";
import { githubSignInEmail, resetPasswordEmail, verificationEmail } from "./authEmails";

describe("escapeHtml", () => {
  it("escapes the five characters that matter in HTML", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
    );
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("Ada Okafor-Smith, ünïcödé")).toBe("Ada Okafor-Smith, ünïcödé");
  });
});

describe("auth email templates", () => {
  const attacker = { email: "ada@example.com", name: `<script>alert("x")</script> Ada` };
  const link = `https://flowboard.test/reset-password/abc"><img src=x onerror=alert(1)>`;

  it("escapes the user's name in the HTML", () => {
    const { html } = resetPasswordEmail(attacker, "https://flowboard.test/reset-password/abc");

    expect(html).not.toContain("<script>");
    expect(html).toContain("Hi &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;,");
  });

  it("escapes the link, so it can't break out of the href", () => {
    const { html } = resetPasswordEmail({ email: "a@b.co", name: "Ada" }, link);

    expect(html).not.toContain('"><img');
    expect(html).toContain("abc&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
  });

  it("includes a plain-text version with the link, for mail apps without HTML", () => {
    const resetUrl = "https://flowboard.test/reset-password/abc123";
    const email = resetPasswordEmail({ email: "ada@example.com", name: "Ada Okafor" }, resetUrl);

    expect(email.to).toBe("ada@example.com");
    expect(email.subject).toBe("Reset your Flowboard password");
    expect(email.text).toContain("Hi Ada,");
    expect(email.text).toContain(resetUrl);
    expect(email.text).toContain("expires in 1 hour");
    expect(email.html).toContain(`href="${resetUrl}"`);
  });

  it("greets people with no name without a blank", () => {
    expect(resetPasswordEmail({ email: "a@b.co", name: null }, "https://x.test").text).toContain("Hi,");
  });

  it("uses the brand colours: cream page, espresso text, vermilion button", () => {
    const { html } = githubSignInEmail({ email: "a@b.co", name: "Ada" }, "https://flowboard.test/login");

    expect(html).toContain("#fbf5ee");
    expect(html).toContain("#1e1512");
    expect(html).toContain("#d23f27");
  });

  it("tells GitHub-only users to sign in with GitHub, with no reset link", () => {
    const email = githubSignInEmail({ email: "a@b.co", name: "Ada" }, "https://flowboard.test/login");

    expect(email.text).toContain("you sign in with GitHub");
    expect(email.text).toContain("https://flowboard.test/login");
    expect(email.text).not.toContain("reset-password");
  });
});

describe("verificationEmail", () => {
  const confirmUrl = "https://flowboard.test/verify-email/link/abc123";
  const email = verificationEmail({ email: "ada@example.com", name: "Ada Okafor" }, "042917", confirmUrl);

  it("puts the code in the subject", () => {
    expect(email.subject).toBe("Your Flowboard code: 042917");
    expect(email.to).toBe("ada@example.com");
  });

  it("shows the code large and spaced out with its expiry, then the backup button and the note", () => {
    expect(email.html).toMatch(/font-size:36px[^>]*letter-spacing:10px[^>]*>042917</);
    expect(email.html).toContain("It expires in 15 minutes.");
    expect(email.html).toContain(`href="${confirmUrl}"`);
    expect(email.html).toContain("Confirm my email");
    expect(email.html).toContain("If you didn&#39;t create a Flowboard account, you can ignore this email.");
    expect(email.html.indexOf("042917<")).toBeLessThan(email.html.indexOf("Confirm my email"));
  });

  it("has a plain-text version with the code and the link", () => {
    expect(email.text).toContain("042917\nIt expires in 15 minutes.");
    expect(email.text).toContain(`Confirm my email: ${confirmUrl}`);
  });
});
