// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { startOver } from "./startOver.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const unverifiedEmpty = { emailVerified: null, _count: { memberships: 0 } };
const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("refused", { code, clientVersion: "test" });

beforeEach(() => resetPrismaMock());

describe("startOver", () => {
  it("deletes an unconfirmed account with nothing in it", async () => {
    prismaMock.user.findUnique.mockResolvedValue(unverifiedEmpty as never);

    await expect(startOver("u1")).resolves.toEqual({ deleted: true });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u1", emailVerified: null } });
  });

  it("never deletes a confirmed account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...unverifiedEmpty, emailVerified: new Date() } as never);

    await expect(startOver("u1")).rejects.toMatchObject({ status: 400, code: "ALREADY_VERIFIED" });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("keeps an older unconfirmed account that is in a project", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...unverifiedEmpty, _count: { memberships: 2 } } as never);

    await expect(startOver("u1")).resolves.toEqual({ deleted: false });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("keeps the account when the database refuses because something still points at it", async () => {
    prismaMock.user.findUnique.mockResolvedValue(unverifiedEmpty as never);
    prismaMock.user.delete.mockRejectedValue(knownError("P2003"));

    await expect(startOver("u1")).resolves.toEqual({ deleted: false });
  });

  it("keeps it when it was confirmed in between (the guarded delete finds nothing)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(unverifiedEmpty as never);
    prismaMock.user.delete.mockRejectedValue(knownError("P2025"));

    await expect(startOver("u1")).resolves.toEqual({ deleted: false });
  });
});

/**
 * Mocked Prisma can't prove what a real delete removes, so this reads the schema itself: every
 * relation to User must either be deleted with it (Cascade), or block the delete (Restrict, which
 * startOver treats as "not empty") or let go (SetNull). A new relation fails here until it's
 * sorted into one of these lists, so "nothing left behind" stays true as the schema grows.
 */
describe("what deleting a user leaves behind (prisma/schema.prisma)", () => {
  const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  const relations = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].flatMap(([, model, body]) =>
    [...body.matchAll(/^\s*\w+\s+User\??\s+@relation\(([^)]*)\)/gm)].map(([, args]) => ({
      model,
      onDelete: /onDelete:\s*(\w+)/.exec(args)?.[1] ?? "none",
    }))
  );

  /** Removed with the user. */
  const CASCADES = ["Account", "PasswordResetToken", "EmailVerificationToken", "ProjectMember"];
  /** Make the delete fail, so startOver keeps the account. */
  const BLOCKERS = ["Invite", "Column", "Task", "Activity", "TaskNote"];
  /** Cleared on the other row (a task's assignee). */
  const RELEASED = ["Task"];

  it("finds the relations", () => {
    expect(relations.length).toBeGreaterThanOrEqual(CASCADES.length);
  });

  it.each(["Cascade", "Restrict", "SetNull"])("sorts every %s relation", (rule) => {
    const expected = { Cascade: CASCADES, Restrict: BLOCKERS, SetNull: RELEASED }[rule]!;
    for (const relation of relations.filter((item) => item.onDelete === rule)) {
      expect(expected, `${relation.model} → User is ${rule}`).toContain(relation.model);
    }
  });

  it("has no relation without an explicit onDelete", () => {
    expect(relations.filter((relation) => relation.onDelete === "none")).toEqual([]);
  });
});
