import type { ReactNode } from "react";

import { cn } from "@/utilities/helpers/cn";

type AuthNoticeProps = {
  /** "error" is announced straight away; "info" waits for a pause. */
  tone: "error" | "info";
  children: ReactNode;
};

/** A message at the top of an auth form, e.g. why sign-in didn't work or why you were signed out. */
export function AuthNotice({ tone, children }: AuthNoticeProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-6 rounded-card px-4 py-3 text-sm font-medium",
        tone === "error"
          ? "border-[1.5px] border-danger bg-surface-card text-danger"
          : "bg-surface-sunken text-fg-primary"
      )}
    >
      {children}
    </p>
  );
}
