// Checks the safety net in setup.ts itself: if one of these ever passes silently,
// a test somewhere could be reaching a real service.
import net from "node:net";
import { describe, expect, it } from "vitest";

describe("test environment", () => {
  it("runs in America/New_York, not the machine's time zone", () => {
    expect(process.env.TZ).toBe("America/New_York");
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
    // 1 January is winter in New York: UTC-5.
    expect(new Date("2026-01-01T12:00:00Z").getTimezoneOffset()).toBe(300);
  });

  it("never loads .env: the database URLs point at a host that can't exist", () => {
    expect(process.env.DATABASE_URL).toContain("@db.invalid:");
    expect(process.env.DIRECT_URL).toContain("@db.invalid:");
    expect(process.env.ALLOW_DB_RESET).toBe("");
  });

  it("makes fetch fail loudly", () => {
    expect(() => fetch("https://example.com")).toThrow("Tests must not use the network");
  });

  it("resolves relative Request URLs against the page, as a browser does", () => {
    expect(new Request("/api/me").url).toBe(new URL("/api/me", window.location.href).href);
  });

  it("makes raw socket connections fail loudly", () => {
    expect(() => net.connect({ host: "example.com", port: 5432 })).toThrow("Tests must not open network connections");
  });

  it("makes the shared Prisma client fail loudly", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    expect(() => prisma.user).toThrow("Tests must not use the database (prisma.user)");
  });

  it("makes building any other Prisma client fail loudly", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    expect(() => new PrismaPg({ connectionString: process.env.DATABASE_URL })).toThrow(
      "Tests must not connect to a database"
    );
  });
});
