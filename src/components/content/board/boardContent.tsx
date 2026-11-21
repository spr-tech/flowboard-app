"use client";

import { useEffect } from "react";

import { ProjectLoadProblem } from "@/components/content/projects/projectLoadProblem";
import { useMe } from "@/services/accountService";
import { useProject } from "@/services/projectsService";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  boardFiltersReset,
  dialogClosed,
  selectBoardPriorityFilter,
  selectOnlyMyTasks,
  selectPendingDeleteTaskIds,
} from "@/stores/uiSlice";
import type { BoardFilters as Filters } from "@/utilities/helpers/boardView";
import { localToday } from "@/utilities/helpers/localToday";
import { flushPendingDeletes } from "@/utilities/hooks/useDeleteTask";
import { useTaskParam } from "@/utilities/hooks/useTaskParam";
import { BoardColumns } from "./boardColumns";
import { BoardFilters } from "./boardFilters";
import { BoardHeader } from "./boardHeader";
import { TaskDrawer } from "./drawer/taskDrawer";
import { DeleteColumnDialog } from "./modals/deleteColumnDialog";

/** /projects/[projectId]: the board (docs/designs/app-screens.md, "Board"). */
export default function BoardContent({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const { data: project, error, isLoading, refetch } = useProject(projectId);
  const { data: me } = useMe();
  const { openTask } = useTaskParam();
  const filters: Filters = {
    priority: useAppSelector(selectBoardPriorityFilter),
    onlyMine: useAppSelector(selectOnlyMyTasks),
    meId: me?.id ?? null,
    hiddenIds: useAppSelector(selectPendingDeleteTaskIds),
  };

  // Leaving the board: filters reset, an open dialog closes, and deletes still in their Undo
  // window are sent now rather than lost.
  useEffect(
    () => () => {
      dispatch(boardFiltersReset());
      dispatch(dialogClosed());
      flushPendingDeletes();
    },
    [dispatch]
  );

  if (isLoading) {
    return (
      <p role="status" className="text-fg-secondary">
        Loading the board…
      </p>
    );
  }
  if (!project) return <ProjectLoadProblem error={error} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-6">
      <BoardHeader project={project} />
      <BoardFilters />
      <BoardColumns project={project} filters={filters} today={localToday()} onOpenTask={openTask} />
      <TaskDrawer project={project} meId={me?.id ?? null} />
      <DeleteColumnDialog project={project} />
    </div>
  );
}
