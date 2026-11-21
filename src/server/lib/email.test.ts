// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const message = { to: "ada@example.com", subject: "Reset your Flowboard password", html: "<p>Hi</p>", text: "Hi" };

// email.ts keeps one transporter per module instance, so load a fresh copy for each test.
async function loadSendEmail() {
  vi.resetModules();
  return (await import("./email")).sendEmail;
}

beforeEach(() => {
  sendMail.mockReset();
  createTransport.mockClear();
  vi.stubEnv("EMAIL_USER", "sender@example.com");
  vi.stubEnv("EMAIL_PASS", "app-password");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("sendEmail", () => {
  it("sends from Flowboard over Gmail port 587 with required TLS and short timeouts, and logs the message id", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>", accepted: ["ada@example.com"], rejected: [] });
    const sendEmail = await loadSendEmail();

    await sendEmail(message);

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "sender@example.com", pass: "app-password" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    // Certificate checks must never be switched off.
    expect(createTransport).not.toHaveBeenCalledWith(expect.objectContaining({ tls: expect.anything() }));
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: { name: "Flowboard", address: "sender@example.com" }, to: "ada@example.com" })
    );
    expect(console.info).toHaveBeenCalledWith(
      "[email] sent",
      expect.objectContaining({ messageId: "<abc@gmail.com>", accepted: ["ada@example.com"] })
    );
  });

  it("logs the full error and rethrows when sending fails", async () => {
    const failure = new Error("Unexpected socket close");
    sendMail.mockRejectedValue(failure);
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(message)).rejects.toBe(failure);
    expect(console.error).toHaveBeenCalledWith('[email] NOT sent: "Reset your Flowboard password"', failure);
  });

  it("treats a rejected recipient as a failure", async () => {
    sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>", accepted: [], rejected: ["ada@example.com"] });
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(message)).rejects.toThrow("rejected: ada@example.com");
    expect(console.error).toHaveBeenCalled();
  });

  it("refuses to run without credentials in production", async () => {
    vi.stubEnv("EMAIL_USER", "");
    vi.stubEnv("NODE_ENV", "production");
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(message)).rejects.toThrow("EMAIL_USER and EMAIL_PASS must be set");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("prints the email instead of sending it in development without credentials", async () => {
    vi.stubEnv("EMAIL_PASS", "");
    vi.stubEnv("NODE_ENV", "development");
    const sendEmail = await loadSendEmail();

    await sendEmail(message);

    expect(sendMail).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("was not sent"));
  });
});
