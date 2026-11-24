"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// The ways to sign in from one page (password, GitHub, Google). Only one can be in progress at a time.
import type { SignInMethod } from "@/models/auth/signInMethod";

type SignInProgress = {
  /** The sign-in under way, or null. While set, every other way to sign in is disabled. */
  pending: SignInMethod | null;
  start: (method: SignInMethod) => void;
  /** Call on failure. On success the page navigates away, so there's nothing to undo. */
  finish: () => void;
};

const SignInProgressContext = createContext<SignInProgress | null>(null);

/**
 * Shared by the sign-in and sign-up pages, so clicking Google or GitHub disables the form, and
 * submitting the form disables both buttons. UI state only: it never holds server data.
 */
export function SignInProgressProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<SignInMethod | null>(null);

  useEffect(() => {
    // Pressing Back from GitHub can restore this page from the browser's back-forward cache,
    // frozen mid-redirect. Start fresh, or every button would stay disabled.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const value = useMemo(() => ({ pending, start: setPending, finish: () => setPending(null) }), [pending]);
  return <SignInProgressContext.Provider value={value}>{children}</SignInProgressContext.Provider>;
}

/** The page's shared sign-in state. Outside a provider (a form on its own), each caller keeps its own. */
export function useSignInProgress(): SignInProgress {
  const shared = useContext(SignInProgressContext);
  const [pending, setPending] = useState<SignInMethod | null>(null);
  return shared ?? { pending, start: setPending, finish: () => setPending(null) };
}
