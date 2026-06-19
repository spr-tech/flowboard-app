import { PrismaClient } from "../lib/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ─── IMPORTS ────────────────────────────────────────────────────────────────
// PrismaClient
//    — the main class Prisma generated when we ran "pnpm prisma generate"
//    — it is the tool that knows how to talk to your Neon database
//    — without it you cannot read or write anything to the database
//
// "../lib/generated/prisma"
//    — the path to where Prisma generated the client code
//    — ../ means go up one folder from the current file location
//    — we are in lib/prisma.ts so ../lib goes up to root then back into lib
//      where the generated folder lives

// ─── GLOBALFORPRISMA ────────────────────────────────────────────────────────
// globalThis
//    — a special JavaScript object that exists everywhere in your entire app
//    — any variable attached to it can be accessed from any file
//    — think of it as a global shared storage space
//
// as unknown as { prisma: PrismaClient | undefined }
//    — this is a TypeScript type assertion
//    — by default TypeScript does not know globalThis can hold a prisma property
//    — we use "as unknown as" to tell TypeScript to treat it as an object
//      that has a prisma property which is either a PrismaClient or undefined
//    — the | means "or" so prisma is either a PrismaClient instance or undefined

// ─── EXPORT CONST PRISMA ────────────────────────────────────────────────────
// export
//    — makes prisma available to be imported in other files
//    — everywhere you need the database you write:
//      import { prisma } from "@/lib/prisma"
//
// globalForPrisma.prisma
//    — checks if a prisma instance already exists on globalThis
//      from a previous hot reload
//
// ?? (nullish coalescing operator)
//    — checks the left side first
//    — if it exists and has a value → use it
//    — if it is null or undefined → use the right side instead
//
// new PrismaClient()
//    — creates a brand new connection to your Neon database
//    — the "new" keyword creates a new instance of the PrismaClient class
//    — this is what actually opens the connection to your database
//
// the whole line means:
//    "use an existing prisma connection if one already exists,
//     otherwise create a brand new one"

// ─── NODE ENV CHECK ─────────────────────────────────────────────────────────
// process.env
//    — an object in Node.js that contains all your environment variables
//    — everything in your .env.local file is accessible here
//
// process.env.NODE_ENV
//    — a special variable Next.js sets automatically, you never set it yourself
//    — "development" → when you run pnpm dev on your computer
//    — "production"  → when running live on Vercel
//    — "test"        → when running automated tests
//
// !== "production"
//    — means "is NOT production"
//    — so this block only runs on your local machine during development
//
// globalForPrisma.prisma = prisma
//    — saves the prisma instance onto globalThis so it survives the next hot reload
//
// why only in development?
//    — in development Next.js hot reloads every time you save a file
//    — without this, each reload creates a new PrismaClient and a new database connection
//    — after 20-30 reloads you would have 20-30 open connections
//    — Neon would start refusing them with a "too many connections" error
//    — in production on Vercel, hot reload never happens
//    — the app starts once and stays running so a fresh PrismaClient is perfectly fine

// ─── SUMMARY ────────────────────────────────────────────────────────────────
// Create one database connection, save it globally so hot reloads in development
// do not create new connections, and export it so every file in the app
// uses the same single connection to the database
