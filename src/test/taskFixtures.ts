// Server-side task test helpers: task rows as Prisma returns them, and a project's members by
// role, answered by user id like the real table. Use with the Prisma mock (src/test/prismaMock.ts).
import type { CardOrder } from "@/models/responses/boardResponses";
import { DEFAULT_MANAGER_PERMISSIONS, type ManagerPermissions } from "@/utilities/helpers/permissions";
import { prismaMock } from "./prismaMock";

export const NOW = new Date("2026-11-22T10:00:00Z");

export const ALL_OFF = Object.fromEntries(
  Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((key) => [key, false])
) as ManagerPermissions;
export const ALL_ON = Object.fromEntries(
  Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((key) => [key, true])
) as ManagerPermissions;

export type MemberRow = {
  role: "OWNER" | "MANAGER" | "MEMBER";
  permissions?: Partial<ManagerPermissions> | null;
  cardOrder?: CardOrder | null;
};

/** The usual cast: alex owns the project, sam is a member, kim a manager with the given switches. */
export const team = (kim: Partial<ManagerPermissions> = DEFAULT_MANAGER_PERMISSIONS): Record<string, MemberRow> => ({
  alex: { role: "OWNER" },
  sam: { role: "MEMBER" },
  kim: { role: "MANAGER", permissions: { ...ALL_OFF, ...kim } },
});

/** projectMember.findUnique / findUniqueOrThrow answer by user id; unknown ids are not members. */
export function givenMembers(rows: Record<string, MemberRow>) {
  const answer = (args: { where: { userId_projectId: { userId: string } } }) => {
    const row = rows[args.where.userId_projectId.userId];
    if (!row) return null;
    return {
      role: row.role,
      permissions: row.permissions ?? null,
      cardOrder: row.cardOrder ?? null,
      pinnedAt: null,
      lastOpenedAt: null,
      joinedAt: NOW,
      userId: args.where.userId_projectId.userId,
    };
  };
  prismaMock.projectMember.findUnique.mockImplementation(((args: never) => Promise.resolve(answer(args))) as never);
  prismaMock.projectMember.findUniqueOrThrow.mockImplementation(((args: never) => {
    const row = answer(args);
    return row ? Promise.resolve(row) : Promise.reject(new Error("not found"));
  }) as never);
}

export function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    projectId: "p1",
    columnId: "todo",
    title: "Fix login",
    description: null,
    priority: "MEDIUM",
    position: 1000,
    dueDate: null,
    completedAt: null,
    createdAt: NOW,
    createdById: "alex",
    takenFromPoolAt: null,
    seenByOwnerAt: NOW,
    assignee: null,
    ...overrides,
  };
}

export const person = (id: string) => ({ id, name: id.toUpperCase(), image: null });

export const columns = {
  todo: { id: "todo", name: "To do", isDone: false },
  doing: { id: "doing", name: "In progress", isDone: false },
  done: { id: "done", name: "Done", isDone: true },
} as const;

/** The task exists; updates echo their data back onto it. */
export function givenTask(task = taskRow(), target: keyof typeof columns = "doing") {
  prismaMock.task.findUnique.mockResolvedValue(task as never);
  prismaMock.task.findUniqueOrThrow.mockResolvedValue(task as never);
  prismaMock.column.findFirst.mockResolvedValue(columns[target] as never);
  prismaMock.column.findUnique.mockResolvedValue({ name: "To do" } as never);
  prismaMock.task.update.mockImplementation(((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...task, ...args.data })) as never);
}
