import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, db seed, studio) uses the DIRECT connection.
// The app itself uses the pooled DATABASE_URL through the adapter in src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
