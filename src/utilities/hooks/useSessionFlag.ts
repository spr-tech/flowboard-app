"use client";

import { useCallback, useState } from "react";

function read(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    // No window (the server render), or storage blocked (private mode, settings): not set.
    return false;
  }
}

/**
 * A true/false that lasts for this browser tab's session: it survives reloads, and is gone once
 * the tab is closed. For "dismissed until next visit" UI. If storage is blocked, it still works
 * until the page reloads.
 */
export function useSessionFlag(key: string): [boolean, () => void] {
  const [isSet, setIsSet] = useState(() => read(key));

  const set = useCallback(() => {
    setIsSet(true);
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Kept in memory only.
    }
  }, [key]);

  return [isSet, set];
}
