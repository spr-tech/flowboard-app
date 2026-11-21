"use client";

// The open task lives in the URL (?task=<id>), so a drawer can be shared or reloaded.
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useTaskParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("task");

  const withTask = useCallback(
    (taskId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (taskId) params.set("task", taskId);
      else params.delete("task");
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  /** Opening adds a history entry, so Back closes the drawer. */
  const openTask = useCallback(
    (taskId: string) => router.push(withTask(taskId), { scroll: false }),
    [router, withTask]
  );
  const closeTask = useCallback(() => router.replace(withTask(null), { scroll: false }), [router, withTask]);

  return { openTaskId, openTask, closeTask };
}
