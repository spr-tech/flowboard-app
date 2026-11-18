import { PrismaClient } from "../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

//What this file does about it
//It creates one connection when your app first starts, stores it in a global place that survives hot reloads, and every time any part of your app needs the database it uses that same single connection instead of opening a new one.

// ─── IMPORTS ────────────────────────────────────────────────────────────────
// PrismaClient
//    — the main class Prisma generated when we ran "pnpm prisma generate"
//    — it knows how to translate your TypeScript code into SQL queries
//    — it no longer connects to the database by itself in Prisma 7
//    — it now relies on a driver adapter to handle the actual connection
//    — imported from our custom output path lib/generated/prisma
//      because we told Prisma to generate its files there in schema.prisma
//
// PrismaPg
//    — the official PostgreSQL driver adapter for Prisma 7
//    — imported from @prisma/adapter-pg which we installed separately
//    — this is what actually opens and manages the connection to your
//      Neon PostgreSQL database
//    — in Prisma 6 and earlier this was handled internally by Prisma itself
//    — in Prisma 7 they removed their own engine and now require you to
//      provide an official database driver like this one

// ─── GLOBALFORPRISMA ────────────────────────────────────────────────────────
// globalThis
//    — a JavaScript object that exists everywhere across your entire app
//    — anything stored on it can be accessed from any file without importing
//    — think of it as a global shared storage shelf
//
// as unknown as { prisma: PrismaClient | undefined }
//    — TypeScript does not know by default that globalThis can hold a
//      prisma property, so it would show a type error
//    — this tells TypeScript to treat globalThis as an object that has
//      a prisma property which is either a PrismaClient or undefined
//    — "as unknown as" is a TypeScript type assertion — a way of saying
//      "trust me, I know what this is even if you don't"
//    — PrismaClient | undefined means the value is either a real
//      PrismaClient instance or nothing at all (not yet created)

// ─── ADAPTER ────────────────────────────────────────────────────────────────
// new PrismaPg({ connectionString: process.env.DATABASE_URL! })
//    — creates a new instance of the PostgreSQL adapter
//    — connectionString is the full Neon database URL from your .env.local
//    — process.env.DATABASE_URL reads that URL from your environment variables
//    — the ! at the end is a TypeScript non-null assertion
//    — it tells TypeScript "I guarantee this value exists and is not undefined"
//    — without the ! TypeScript would warn you that DATABASE_URL might be
//      undefined, because environment variables are not guaranteed to exist
//    — this adapter is what physically opens the connection to your
//      Neon PostgreSQL database when Prisma needs to run a query

// ─── EXPORT CONST PRISMA ────────────────────────────────────────────────────
// export
//    — makes the prisma instance available to every other file in your app
//    — any file that needs to talk to the database imports it like this:
//      import { prisma } from "@/lib/prisma"
//
// globalForPrisma.prisma ?? new PrismaClient({ adapter })
//    — the ?? is the nullish coalescing operator
//    — it checks the left side first: does a prisma instance already exist
//      on globalThis from a previous hot reload?
//    — if yes → reuse that existing instance, do not create a new one
//    — if no → create a brand new PrismaClient and pass it the adapter
//    — new PrismaClient({ adapter }) is how Prisma 7 requires you to
//      construct the client — you must pass the adapter explicitly
//    — in Prisma 6 you could write new PrismaClient() with nothing inside
//    — in Prisma 7 that throws an error — the adapter is mandatory

// ─── NODE ENV CHECK ─────────────────────────────────────────────────────────
// process.env.NODE_ENV
//    — a special variable Next.js sets automatically
//    — "development" when you run pnpm dev on your computer
//    — "production" when your app is running live on Vercel
//
// !== "production"
//    — this block only runs when you are developing locally
//    — it does NOT run when deployed on Vercel
//
// globalForPrisma.prisma = prisma
//    — saves the prisma instance onto globalThis
//    — this is the key to preventing the "too many connections" problem
//    — in development Next.js hot reloads every time you save a file
//    — without this line each hot reload would create a brand new
//      PrismaClient which means a brand new database connection
//    — after many reloads you would have dozens of open connections
//      and Neon would start refusing them
//    — by saving to globalThis the instance survives hot reloads
//    — the next reload finds it already there and reuses it
//    — in production on Vercel hot reload never happens so we skip this

// ─── SUMMARY ────────────────────────────────────────────────────────────────
// PrismaPg opens the physical connection to your Neon PostgreSQL database
// PrismaClient uses that connection to translate your TypeScript into SQL
// The singleton pattern ensures only one connection ever exists at a time
// globalThis makes that single connection survive development hot reloads
// The adapter pattern is mandatory in Prisma 7 — it cannot be skipped
