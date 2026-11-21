// @vitest-environment node
// Migrations run against a real database, which tests never touch. These checks read the SQL
// itself, to guard the parts a plain `prisma migrate diff` would have got wrong. The proof applies
// it to the dev branch and checks the result there.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  fileURLToPath(new URL("./migrations/20261122120000_column_permissions_and_order/migration.sql", import.meta.url)),
  "utf8"
);
/** The SQL without comments, squashed to single spaces. */
const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join(" ")
  .replace(/\s+/g, " ");

describe("migration column_permissions_and_order", () => {
  it("adds createdById as nullable, backfills it, and only then makes it required", () => {
    const add = statements.indexOf('ADD COLUMN "createdById" TEXT;');
    const backfill = statements.indexOf('UPDATE "Column"');
    const required = statements.indexOf('ALTER COLUMN "createdById" SET NOT NULL');

    expect(add).toBeGreaterThan(-1);
    expect(backfill).toBeGreaterThan(add);
    expect(required).toBeGreaterThan(backfill);
  });

  it("backfills every column with its project's owner and the project's createdAt", () => {
    expect(statements).toContain('SET "createdById" = pm."userId", "createdAt" = p."createdAt"');
    expect(statements).toContain(`JOIN "ProjectMember" AS pm ON pm."projectId" = p."id" AND pm."role" = 'OWNER'`);
    expect(statements).toContain('WHERE c."projectId" = p."id"');
  });

  it("adds the project settings with their defaults, the description, and the personal order", () => {
    expect(statements).toContain('ADD COLUMN "membersCanAddColumns" BOOLEAN NOT NULL DEFAULT false');
    expect(statements).toContain('ADD COLUMN "memberColumnLimit" INTEGER NOT NULL DEFAULT 3');
    expect(statements).toContain('ADD COLUMN "description" TEXT');
    expect(statements).toContain('ALTER TABLE "ProjectMember" ADD COLUMN "columnOrder" JSONB;');
  });
});
