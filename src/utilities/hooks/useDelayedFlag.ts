"use client";

// Loading UI only for slow loads: the flag turns true once `active` has stayed true for `delayMs`,
// so a fast load never flashes a skeleton. It turns false as soon as `active` does.
import { useEffect, useState } from "react";

export const LOADING_UI_DELAY_MS = 200;

export function useDelayedFlag(active: boolean, delayMs = LOADING_UI_DELAY_MS) {
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setWaited(true), delayMs);
    return () => {
      clearTimeout(timer);
      setWaited(false);
    };
  }, [active, delayMs]);

  return active && waited;
}
