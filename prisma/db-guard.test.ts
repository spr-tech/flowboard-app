import { beforeEach, describe, expect, it, vi } from "vitest";

import { assertDbResetAllowed } from "./db-guard";

const DB_URL = "postgresql://flowboard:s3cret-password@ep-dev-branch.eu-central-1.aws.neon.tech/neondb?sslmode=require";

/** Thrown in place of a real exit, so the test keeps running and can see that it happened. */
class ExitCalled extends Error {
  constructor(readonly code: number | string | null | undefined) {
    super(`process.exit(${code})`);
  }
}

let logged: string;
let errored: string;

beforeEach(() => {
  logged = "";
  errored = "";
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logged += args.join(" ");
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errored += args.join(" ");
  });
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitCalled(code);
  });
  vi.stubEnv("DIRECT_URL", DB_URL);
});

describe("assertDbResetAllowed", () => {
  it("refuses when ALLOW_DB_RESET is not set", () => {
    vi.stubEnv("ALLOW_DB_RESET", undefined);

    expect(() => assertDbResetAllowed()).toThrow(ExitCalled);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(errored).toContain("Refusing to run");
  });

  it.each(["yes", "TRUE", "1", ""])('refuses when ALLOW_DB_RESET is "%s"', (value) => {
    vi.stubEnv("ALLOW_DB_RESET", value);
    expect(() => assertDbResetAllowed()).toThrow(ExitCalled);
  });

  it('allows it when ALLOW_DB_RESET is "true"', () => {
    vi.stubEnv("ALLOW_DB_RESET", "true");

    expect(() => assertDbResetAllowed()).not.toThrow();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("prints the host it is about to wipe, before deciding", () => {
    vi.stubEnv("ALLOW_DB_RESET", undefined);
    expect(() => assertDbResetAllowed()).toThrow(ExitCalled);

    expect(logged).toContain("Database to wipe: ep-dev-branch.eu-central-1.aws.neon.tech");
  });

  it("never prints the password or the user name", () => {
    vi.stubEnv("ALLOW_DB_RESET", "true");
    assertDbResetAllowed();

    expect(logged + errored).not.toContain("s3cret-password");
    expect(logged + errored).not.toContain("flowboard:");
  });

  it("says so when DIRECT_URL is missing", () => {
    vi.stubEnv("DIRECT_URL", undefined);
    vi.stubEnv("ALLOW_DB_RESET", "true");
    assertDbResetAllowed();

    expect(logged).toContain("(DIRECT_URL is not set)");
  });

  it("says so when DIRECT_URL is not a URL", () => {
    vi.stubEnv("DIRECT_URL", "not a url");
    vi.stubEnv("ALLOW_DB_RESET", "true");
    assertDbResetAllowed();

    expect(logged).toContain("(DIRECT_URL is not a valid URL)");
  });
});
