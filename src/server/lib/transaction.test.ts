// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { transaction, TRANSACTION_OPTIONS } from "./transaction";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

beforeEach(() => resetPrismaMock());

describe("transaction", () => {
  it("runs the callback in prisma.$transaction with the shared limits", async () => {
    const result = await transaction(async () => "done");

    expect(result).toBe("done");
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), TRANSACTION_OPTIONS);
    expect(TRANSACTION_OPTIONS).toEqual({ maxWait: 10_000, timeout: 15_000 });
  });
});

/** Every .ts file under src/server, tests excluded. */
function serverFiles(dir = join(process.cwd(), "src", "server")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return serverFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

describe("server code", () => {
  it("starts every interactive transaction through transaction(), never prisma.$transaction(async ...)", () => {
    const offenders = serverFiles().filter((file) => /\$transaction\(\s*async/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("never sends email inside a transaction callback", () => {
    // A rough check: no sendEmail between `transaction(async` and the callback's end. The services'
    // own tests check the order for real (email only after the transaction resolves).
    for (const file of serverFiles()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/transaction\(async \(tx\) => \{/g)) {
        let depth = 0;
        let end = match.index + match[0].length - 1;
        for (; end < source.length; end++) {
          if (source[end] === "{") depth++;
          if (source[end] === "}" && --depth === 0) break;
        }
        expect(source.slice(match.index, end), file).not.toMatch(/sendEmail|sendInvite/);
      }
    }
  });
});
