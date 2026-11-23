// Vitest config: React components in jsdom, the "@/" alias for src/, and a fixed environment.
// Tests never read .env: every value they need is set here, and src/test/setup.ts stops
// dotenv from loading the real file.
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.ts"],
    // A test that forgets to reset a mock or a stubbed global can't leak into the next one.
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    env: {
      // Not Lagos on purpose: date code that uses the machine's time zone fails here
      // instead of passing by luck on a laptop in Lagos.
      TZ: "America/New_York",
      // ".invalid" can never resolve, so even a missed mock can't reach a real database.
      DATABASE_URL: "postgresql://test:test@db.invalid:5432/flowboard",
      DIRECT_URL: "postgresql://test:test@db.invalid:5432/flowboard",
      AUTH_SECRET: "test-secret-not-used-anywhere-real",
      AUTH_GITHUB_ID: "test-github-id",
      AUTH_GITHUB_SECRET: "test-github-secret",
      AUTH_TRUST_HOST: "true",
      // Explicitly off: only the db-guard tests turn it on, one test at a time.
      ALLOW_DB_RESET: "",
    },
  },
});
