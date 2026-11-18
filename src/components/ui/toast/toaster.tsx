"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

// Sonner reads its colours from these CSS variables; we point them at our role tokens.
const toasterStyle = {
  "--normal-bg": "var(--surface-inverse)",
  "--normal-text": "var(--fg-on-inverse)",
  "--normal-border": "var(--surface-inverse-raised)",
  "--border-radius": "18px",
} as CSSProperties;

/** Mounted once, in the root layout. Show toasts with `toast()` from ./toast. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4000}
      visibleToasts={3}
      style={toasterStyle}
      toastOptions={{ className: "font-sans" }}
    />
  );
}
