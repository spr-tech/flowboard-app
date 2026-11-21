"use client";

import { useEffect, useRef } from "react";

import { Drawer } from "@/components/ui/drawer/drawer";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { useAppSelector } from "@/stores/hooks";
import { selectPendingDeleteTaskIds } from "@/stores/uiSlice";
import { useTaskParam } from "@/utilities/hooks/useTaskParam";
import { TaskDrawerForm } from "./taskDrawerForm";

type TaskDrawerProps = { project: ProjectDetail; meId: string | null };

/**
 * The task drawer, open while the URL has ?task=<id> (shareable, survives a reload). Esc, the
 * overlay and × remove the parameter, saving any waiting edit first. A task that doesn't exist,
 * was deleted, or is waiting out its Undo window closes the drawer quietly.
 */
export function TaskDrawer({ project, meId }: TaskDrawerProps) {
  const { openTaskId, closeTask } = useTaskParam();
  const hiddenIds = useAppSelector(selectPendingDeleteTaskIds);
  const flushRef = useRef<(() => void) | null>(null);
  const task =
    openTaskId && !hiddenIds.includes(openTaskId) ? project.tasks.find((t) => t.id === openTaskId) : undefined;
  const column = project.columns.find((candidate) => candidate.id === task?.columnId);

  useEffect(() => {
    if (openTaskId && !task) closeTask();
  }, [openTaskId, task, closeTask]);

  const close = () => {
    flushRef.current?.();
    closeTask();
  };

  return (
    <Drawer
      isOpen={!!task}
      onClose={close}
      title={task ? `${project.name} · ${column?.name ?? ""}` : "Task"}
      width="lg"
    >
      {task && (
        <TaskDrawerForm
          key={task.id}
          project={project}
          task={task}
          meId={meId}
          flushRef={flushRef}
          onDeleted={closeTask}
        />
      )}
    </Drawer>
  );
}
