"use client";

// Delete with Undo (docs/designs/app-screens.md, decision 5). No confirm dialog: the task hides
// at once and a toast offers Undo for 5 seconds. The DELETE request is only sent when the toast
// closes without Undo. While waiting, the task's id sits in uiSlice's pendingDeleteTaskIds, and
// the board and drawer hide those ids, so a refetch in the meantime can't bring the task back.
import { useCallback, useEffect } from "react";

import { dismissToast, toast } from "@/components/ui/toast/toast";
import { useDeleteTaskMutation } from "@/services/tasksService";
import { useAppDispatch } from "@/stores/hooks";
import { taskDeletePending, taskDeleteSettled } from "@/stores/uiSlice";

export const UNDO_WINDOW_MS = 5000;

type PendingDelete = { commit: () => void; toastId: string };

/** Deletes waiting out their Undo window, across every component that uses this hook. */
const pending = new Map<string, PendingDelete>();

/** Sends every waiting delete now, and closes their toasts (leaving the board). */
export function flushPendingDeletes() {
  for (const [, entry] of pending) {
    entry.commit();
    dismissToast(entry.toastId);
  }
}

/**
 * The page is going away (tab closed, reload): an ordinary request could be cancelled, so send
 * the waiting deletes with keepalive, which the browser finishes even after the page is gone.
 */
function sendPendingOnPageHide() {
  for (const [taskId] of pending) {
    void fetch(`/api/tasks/${taskId}`, { method: "DELETE", keepalive: true, credentials: "same-origin" });
  }
  pending.clear();
}

export function useDeleteTask(projectId: string) {
  const dispatch = useAppDispatch();
  const [deleteTask] = useDeleteTaskMutation();

  useEffect(() => {
    window.addEventListener("pagehide", sendPendingOnPageHide);
    return () => window.removeEventListener("pagehide", sendPendingOnPageHide);
  }, []);

  return useCallback(
    (task: { id: string; title: string }) => {
      const toastId = `delete-task:${task.id}`;
      dispatch(taskDeletePending(task.id));

      const commit = () => {
        // Only once: the toast closing after a flush must not send a second request.
        if (!pending.has(task.id)) return;
        pending.delete(task.id);
        deleteTask({ projectId, taskId: task.id })
          .unwrap()
          .catch(() => {
            // The task comes back (it was only hidden); the base query showed the error toast.
          })
          .finally(() => dispatch(taskDeleteSettled(task.id)));
      };
      pending.set(task.id, { commit, toastId });

      toast({
        type: "success",
        message: "Task deleted",
        id: toastId,
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onClick: () => {
            pending.delete(task.id);
            dispatch(taskDeleteSettled(task.id));
          },
        },
        onClose: commit,
      });
    },
    [dispatch, deleteTask, projectId]
  );
}
