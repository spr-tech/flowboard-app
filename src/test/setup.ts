// Runs before every test file. Two jobs:
// 1. Make the outside world unreachable: no .env, no network, no database. Anything that tries
//    fails loudly with a message saying what to mock, instead of quietly hitting a real service.
// 2. Mock the Next.js and Auth.js modules that only work inside a running Next app.
import net from "node:net";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// ─── No .env ─────────────────────────────────────────────────────────────────
// Some files import "dotenv/config" (prisma/db-guard.ts). Left alone it would load the real
// .env, so a test could pass on one laptop and fail on another. vitest.config.ts sets every value.
vi.mock("dotenv/config", () => ({}));

// ─── No network ──────────────────────────────────────────────────────────────
// Assigned directly rather than with vi.stubGlobal, so `unstubGlobals` never puts the real one back.
globalThis.fetch = (input: RequestInfo | URL) => {
  throw new Error(`Tests must not use the network (fetch ${String(input)}). Mock it in the test.`);
};

// In a browser, new Request("/api/me") resolves against the page address. Node's Request (which
// jsdom tests use) can't, so RTK Query's relative base URL "/api" would fail before reaching the
// mocked fetch. Resolve relative URLs against window.location, as a browser does.
if (typeof window !== "undefined") {
  const NodeRequest = globalThis.Request;
  globalThis.Request = class BrowserLikeRequest extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === "string" ? new URL(input, window.location.href) : input, init);
    }
  };
}

// Catches everything below fetch too, including a real Postgres driver opening a socket.
net.Socket.prototype.connect = function blockedConnect(): never {
  throw new Error("Tests must not open network connections. Mock the module that tried to.");
};

// ─── No database ─────────────────────────────────────────────────────────────
// Any use of the shared client throws. A test that needs data mocks this module itself.
vi.mock("@/server/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, property) {
        // Let Vitest and Promise checks inspect the object without tripping the guard.
        if (typeof property === "symbol" || property === "then") return undefined;
        throw new Error(
          `Tests must not use the database (prisma.${String(property)}). Mock "@/server/lib/prisma" in the test.`,
        );
      },
    },
  ),
}));

// Code that builds its own client (prisma/seed.ts) goes through this adapter.
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor() {
      throw new Error("Tests must not connect to a database (new PrismaPg). Mock Prisma in the test.");
    }
  },
}));

// ─── Next.js and Auth.js ─────────────────────────────────────────────────────
// next/font only works inside the Next compiler; any font returns stable class names.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font-mock", variable: "--font-mock", style: { fontFamily: "mock" } });
  return new Proxy({}, { get: (_target, property) => (property === "__esModule" ? true : font) });
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated", update: vi.fn() }),
  SessionProvider: ({ children }: { children: unknown }) => children,
}));

// ─── Between tests ───────────────────────────────────────────────────────────
afterEach(() => {
  // Without Vitest globals, Testing Library can't register its own cleanup.
  cleanup();
  vi.useRealTimers();
});
