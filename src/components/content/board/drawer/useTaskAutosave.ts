"use client";

// Saving as you edit, for the drawer's text fields (decision H). Title and description save on
// blur or after an 800ms pause in typing, so typing doesn't write a row per keystroke. Closing
// the drawer (or leaving the page) saves whatever is still waiting, immediately: an edit is never
// dropped with its timer.
import { useCallback, useEffect, useRef } from "react";

import { taskTitleField, TASK_DESCRIPTION_MAX } from "@/models/validations/boardValidation";
import { useUpdateTaskMutation, type UpdateTaskArgs } from "@/services/tasksService";

export const AUTOSAVE_DELAY_MS = 800;

export type TextField = "title" | "description";
type TextValues = Record<TextField, string>;

/** What the server should store for a text field, or an error message. */
export function cleanText(field: TextField, value: string): { value: string | null } | { error: string } {
  if (field === "title") {
    const parsed = taskTitleField.safeParse(value);
    return parsed.success ? { value: parsed.data } : { error: parsed.error.issues[0]?.message ?? "Check the title" };
  }
  if (value.length > TASK_DESCRIPTION_MAX)
    return { error: `Keep the description to ${TASK_DESCRIPTION_MAX} characters or fewer` };
  return { value: value.trim() || null };
}

type Options = {
  projectId: string;
  taskId: string;
  /** The values as last saved (the task when the drawer opened). */
  saved: { title: string; description: string | null };
  /** Current field values, read at save time. */
  read: () => TextValues;
  onError: (field: TextField, message: string) => void;
};

export function useTaskAutosave({ projectId, taskId, saved, read, onError }: Options) {
  const [updateTask] = useUpdateTaskMutation();
  const lastSaved = useRef<{ title: string; description: string | null }>(saved);
  const waiting = useRef(new Set<TextField>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelled = useRef(false);
  // The latest options, for the save that runs from the unmount cleanup.
  const latest = useRef({ projectId, taskId, read, onError, updateTask });
  useEffect(() => {
    latest.current = { projectId, taskId, read, onError, updateTask };
  });

  /** Saves every waiting field now (only those that changed and are valid). */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (isCancelled.current || waiting.current.size === 0) return;
    const { projectId: pid, taskId: tid, read: readValues, onError: report, updateTask: send } = latest.current;
    const values = readValues();
    const changes: Partial<Pick<UpdateTaskArgs, "title" | "description">> = {};
    for (const field of waiting.current) {
      const cleaned = cleanText(field, values[field]);
      if ("error" in cleaned) {
        report(field, cleaned.error);
        continue;
      }
      if (cleaned.value !== lastSaved.current[field]) {
        if (field === "title" && cleaned.value !== null) changes.title = cleaned.value;
        if (field === "description") changes.description = cleaned.value;
      }
    }
    waiting.current.clear();
    if (Object.keys(changes).length === 0) return;
    const previous = { ...lastSaved.current };
    lastSaved.current = { ...lastSaved.current, ...changes };
    send({ projectId: pid, taskId: tid, ...changes })
      .unwrap()
      .catch(() => {
        // The field keeps what was typed; the base query showed why it didn't save.
        lastSaved.current = previous;
      });
  }, []);

  /** A keystroke: save after a pause. */
  const changed = useCallback(
    (field: TextField) => {
      waiting.current.add(field);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  /** The task is being deleted: drop anything waiting instead of saving it. */
  const cancel = useCallback(() => {
    isCancelled.current = true;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Leaving (drawer unmounts, page navigates): save what's waiting.
  useEffect(() => flush, [flush]);

  return { changed, blurred: flush, flush, cancel };
}
