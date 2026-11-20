"use client";

import { setupListeners } from "@reduxjs/toolkit/query";
import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "./store";

/** Mounted once, in the root layout. Gives every client component the same store. */
export function StoreProvider({ children }: { children: ReactNode }) {
  // One store per browser tab, created on the first render and kept for the life of the page
  // (see store.ts for why it must not be a shared module-level store). The Redux docs show this
  // with useRef; a lazy useState initialiser does the same (it runs once) without reading a ref
  // during render, which React's lint rules forbid.
  const [store] = useState<AppStore>(makeStore);

  useEffect(() => {
    // setupListeners is what makes RTK Query's refetchOnFocus and refetchOnReconnect work:
    // it listens for the tab regaining focus and the network coming back, and tells the cache.
    // It returns its own cleanup, so React's double mount in development doesn't add two listeners.
    return setupListeners(store.dispatch);
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
