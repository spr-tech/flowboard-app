import { describe, expect, it } from "vitest";

import { createProjectSchema, projectGeneralFormSchema, updateProjectSchema } from "./projectValidation";

describe("project description", () => {
  it("is optional when creating a project", () => {
    expect(createProjectSchema.parse({ name: "Launch", colour: "teal" })).toEqual({ name: "Launch", colour: "teal" });
  });

  it("is trimmed, and empty becomes null", () => {
    expect(
      createProjectSchema.parse({ name: "Launch", colour: "teal", description: "  For the launch  " })
    ).toMatchObject({
      description: "For the launch",
    });
    expect(updateProjectSchema.parse({ description: "   " })).toEqual({ description: null });
    expect(projectGeneralFormSchema.parse({ name: "Launch", colour: "teal", description: "" }).description).toBeNull();
  });

  it("allows 200 characters, not 201", () => {
    expect(updateProjectSchema.safeParse({ description: "x".repeat(200) }).success).toBe(true);
    const tooLong = updateProjectSchema.safeParse({ description: "x".repeat(201) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe("Keep the description to 200 characters or fewer");
  });
});

describe("task settings", () => {
  it("accepts a whole-number take limit from 1 to 20", () => {
    expect(updateProjectSchema.parse({ memberTakeLimit: 20 })).toEqual({
      memberTakeLimit: 20,
    });
    expect(updateProjectSchema.safeParse({ memberTakeLimit: 0 }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ memberTakeLimit: 21 }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ memberTakeLimit: 2.5 }).success).toBe(false);
  });

  it("refuses an empty change", () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
  });
});
