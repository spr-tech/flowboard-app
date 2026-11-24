// @vitest-environment node
// The verification gate (src/server/lib/route.ts): every signed-in API route refuses unconfirmed
// users unless it says auth: "allowUnverified". This reads every route file, so opening another
// route to unconfirmed users is a deliberate change to the list below, never an accident.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join(process.cwd(), "src", "app", "api");

/** Only what the code page needs, and accepting an invite (which confirms the email itself). */
const OPEN_TO_UNVERIFIED = [
  "auth/verify-email/code/route.ts",
  "auth/verify-email/send/route.ts",
  "auth/verify-email/start-over/route.ts",
  "auth/verify-email/status/route.ts",
  "invites/token/[token]/accept/route.ts",
  "me/route.ts",
];

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

describe("API routes open to unconfirmed emails", () => {
  const files = routeFiles(API_DIR).map((path) => ({
    name: relative(API_DIR, path).split("\\").join("/"),
    source: readFileSync(path, "utf8"),
  }));

  it("are exactly the code page's routes and invite acceptance", () => {
    const open = files.filter((file) => file.source.includes('auth: "allowUnverified"')).map((file) => file.name);
    expect(open.sort()).toEqual([...OPEN_TO_UNVERIFIED].sort());
  });

  it("GET /api/me is the only handler in its file open to them (renaming yourself stays gated)", () => {
    const me = files.find((file) => file.name === "me/route.ts")!.source;
    expect(me).toMatch(/GET = route\(\{ auth: "allowUnverified"/);
    expect(me).toMatch(/PATCH = route\(\{ auth: true/);
  });
});
