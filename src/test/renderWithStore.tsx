// Renders a component inside a fresh Redux store, as StoreProvider does in the app.
// A new store per test, so no cached query leaks from one test into the next.
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { vi } from "vitest";

import { makeStore } from "@/stores/store";

export function renderWithStore(ui: ReactElement, options?: RenderOptions) {
  const store = makeStore();
  return { store, ...render(<Provider store={store}>{ui}</Provider>, options) };
}

/** A JSON Response, for mocked fetch calls. */
export function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Replaces fetch for one test; the setup file's "no network" fetch comes back afterwards. */
export function mockFetch(handler: (request: Request) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input instanceof Request ? input : new Request(input, init))
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
