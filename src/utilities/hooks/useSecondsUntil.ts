"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds from now until `until` (an ISO time), counting down once a second; 0 once it's
 * passed or when there's nothing to wait for (null). For cooldowns like "Resend code in 42s".
 */
export function useSecondsUntil(until: string | null | undefined): number {
  const target = until ? Date.parse(until) : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= target) clearInterval(timer);
    };
    // Straight away too: `now` may be stale if the last countdown ended a while ago.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [target]);

  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}
