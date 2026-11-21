// Demo data for a fresh database. Run with `pnpm db:seed` or `pnpm db:reset`.
// Wipes every table first, so it is safe to run again. Guarded by ALLOW_DB_RESET (see db-guard.ts).
//
// Sign in as:  demo@example.com / Flowboard123!   (project OWNER)
//              sam@example.com  / Flowboard123!   (project MEMBER)
//
// All dates are relative to the moment the seed runs, so "overdue" and "today" stay true.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Priority } from "../src/lib/generated/prisma";
import { assertDbResetAllowed } from "./db-guard";

assertDbResetAllowed();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
});

const DEMO_PASSWORD = "Flowboard123!";
const DAY_MS = 24 * 60 * 60 * 1000;

// Emails are always stored lowercase.
const normaliseEmail = (email: string) => email.trim().toLowerCase();

// A calendar day `offset` days from today (UTC midnight), for the date-only dueDate column.
function day(offset: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

// A moment `days` days ago (fractions allowed), for timestamps.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

type ColumnKey = "todo" | "doing" | "review" | "done";
type UserKey = "demo" | "sam";

interface SeedTask {
  title: string;
  description?: string;
  column: ColumnKey;
  priority: Priority;
  assignee: UserKey | null;
  dueInDays: number | null; // negative = overdue, 0 = today, null = no due date
  createdDaysAgo: number;
  completedDaysAgo?: number; // only for tasks in Done
}

const COLUMNS: { key: ColumnKey; name: string; isDone: boolean }[] = [
  { key: "todo", name: "To do", isDone: false },
  { key: "doing", name: "In progress", isDone: false },
  { key: "review", name: "Review", isDone: false },
  { key: "done", name: "Done", isDone: true },
];

// Listed in board order: within a column, earlier entries sit higher.
const TASKS: SeedTask[] = [
  {
    title: "Write homepage copy",
    description: "Headline, three feature blurbs and the call to action.",
    column: "todo",
    priority: "HIGH",
    assignee: "demo",
    dueInDays: -3,
    createdDaysAgo: 12,
  },
  { title: "Pick a font pairing", column: "todo", priority: "LOW", assignee: "sam", dueInDays: 6, createdDaysAgo: 10 },
  { title: "Set up analytics", column: "todo", priority: "MEDIUM", assignee: null, dueInDays: null, createdDaysAgo: 8 },
  {
    title: "Plan the launch email",
    column: "todo",
    priority: "MEDIUM",
    assignee: "demo",
    dueInDays: 14,
    createdDaysAgo: 4,
  },
  {
    title: "Design the pricing page",
    description: "Three plans, monthly and yearly toggle.",
    column: "doing",
    priority: "HIGH",
    assignee: "demo",
    dueInDays: 0,
    createdDaysAgo: 11,
  },
  {
    title: "Build the contact form",
    column: "doing",
    priority: "MEDIUM",
    assignee: "sam",
    dueInDays: -1,
    createdDaysAgo: 9,
  },
  { title: "Compress hero images", column: "doing", priority: "LOW", assignee: "sam", dueInDays: 2, createdDaysAgo: 6 },
  {
    title: "Review navigation labels",
    column: "review",
    priority: "MEDIUM",
    assignee: "demo",
    dueInDays: 1,
    createdDaysAgo: 7,
  },
  {
    title: "Agree the sitemap",
    column: "done",
    priority: "HIGH",
    assignee: "demo",
    dueInDays: -10,
    createdDaysAgo: 13,
    completedDaysAgo: 9,
  },
  {
    title: "Collect brand assets",
    column: "done",
    priority: "MEDIUM",
    assignee: "sam",
    dueInDays: -6,
    createdDaysAgo: 12,
    completedDaysAgo: 5,
  },
  {
    title: "Set up the repository",
    column: "done",
    priority: "LOW",
    assignee: "demo",
    dueInDays: null,
    createdDaysAgo: 13,
    completedDaysAgo: 2,
  },
];

async function wipe() {
  // Children before parents.
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await wipe();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demo = await prisma.user.create({
    data: { name: "Alex Morgan", email: normaliseEmail("demo@example.com"), passwordHash, createdAt: daysAgo(15) },
  });
  const sam = await prisma.user.create({
    data: { name: "Sam Rivera", email: normaliseEmail("sam@example.com"), passwordHash, createdAt: daysAgo(14) },
  });
  const users: Record<UserKey, string> = { demo: demo.id, sam: sam.id };

  const project = await prisma.project.create({
    data: {
      name: "Website relaunch",
      description: "Rebuilding the marketing site before the January launch",
      colour: "vermilion",
      createdAt: daysAgo(14),
      members: {
        create: [
          { userId: demo.id, role: "OWNER", joinedAt: daysAgo(14) },
          { userId: sam.id, role: "MEMBER", joinedAt: daysAgo(13) },
        ],
      },
    },
  });

  const columnIds = {} as Record<ColumnKey, string>;
  for (const [index, column] of COLUMNS.entries()) {
    const created = await prisma.column.create({
      data: {
        projectId: project.id,
        name: column.name,
        isDone: column.isDone,
        position: (index + 1) * 1000,
        // The owner set up the board when the project was created.
        createdById: demo.id,
        createdAt: daysAgo(14),
      },
    });
    columnIds[column.key] = created.id;
  }
  const columnName = (key: ColumnKey) => COLUMNS.find((c) => c.key === key)!.name;
  // The column just to the left, i.e. where a task came from when it moved one step along.
  const previousColumnName = (key: ColumnKey) => COLUMNS[Math.max(COLUMNS.findIndex((c) => c.key === key) - 1, 0)].name;

  await prisma.activity.createMany({
    data: [
      {
        projectId: project.id,
        actorId: demo.id,
        action: "project.created",
        meta: { name: project.name },
        createdAt: daysAgo(14),
      },
      { projectId: project.id, actorId: sam.id, action: "member.joined", createdAt: daysAgo(13) },
    ],
  });

  const nextPosition: Record<ColumnKey, number> = { todo: 1000, doing: 1000, review: 1000, done: 1000 };

  for (const [index, seedTask] of TASKS.entries()) {
    const position = nextPosition[seedTask.column];
    nextPosition[seedTask.column] += 1000;

    // Alternate creators so the feed shows both people.
    const creatorId = index % 2 === 0 ? demo.id : sam.id;
    const createdAt = daysAgo(seedTask.createdDaysAgo);
    const completedAt = seedTask.completedDaysAgo === undefined ? null : daysAgo(seedTask.completedDaysAgo);

    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        columnId: columnIds[seedTask.column],
        title: seedTask.title,
        description: seedTask.description,
        priority: seedTask.priority,
        position,
        dueDate: seedTask.dueInDays === null ? null : day(seedTask.dueInDays),
        assigneeId: seedTask.assignee ? users[seedTask.assignee] : null,
        createdById: creatorId,
        completedAt,
        createdAt,
      },
    });

    const activity: { action: string; actorId: string; meta: Record<string, string>; createdAt: Date }[] = [
      { action: "task.created", actorId: creatorId, meta: { title: task.title, column: "To do" }, createdAt },
    ];
    // Anything past "To do" got there by a move. Done tasks were completed by their assignee.
    if (seedTask.column !== "todo") {
      const mover = seedTask.assignee ? users[seedTask.assignee] : creatorId;
      const isDone = seedTask.column === "done";
      activity.push({
        action: isDone ? "task.completed" : "task.moved",
        actorId: mover,
        meta: { title: task.title, from: previousColumnName(seedTask.column), to: columnName(seedTask.column) },
        createdAt: completedAt ?? daysAgo(seedTask.createdDaysAgo / 2),
      });
    }

    await prisma.activity.createMany({
      data: activity.map((row) => ({ ...row, projectId: project.id, taskId: task.id })),
    });
  }

  const activityCount = await prisma.activity.count();
  console.log(
    `Seeded 2 users, 1 project, ${COLUMNS.length} columns, ${TASKS.length} tasks, ${activityCount} activity rows.\n` +
      `Sign in as demo@example.com or sam@example.com, password ${DEMO_PASSWORD}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
