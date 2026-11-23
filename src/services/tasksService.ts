// Tasks: /api/tasks and /api/projects/:projectId/tasks (docs/plan/04-api.md, "Tasks").
//
// The board lives in the getProject cache entry (projectsService), so every task write updates
// that entry with the task the server returns, instead of refetching the whole board.
// moveTask is optimistic (docs/plan/05-state.md): the card lands before the server answers.
import type { BoardTask, DeletedResponse } from "@/models/responses/boardResponses";
import { baseApi } from "@/configs/serviceConfig";
import type { AppDispatch } from "@/stores/store";
import { ApiTag } from "@/utilities/enums/apiTags";
import { positionBetween } from "@/utilities/helpers/position";
import { dashboardService } from "./dashboardService";
import { projectsService } from "./projectsService";

export type CreateTaskArgs = { projectId: string; title: string; columnId: string };
export type UpdateTaskArgs = {
  projectId: string;
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: BoardTask["priority"];
  assigneeId?: string | null;
  dueDate?: string | null;
};
export type MoveTaskArgs = {
  projectId: string;
  taskId: string;
  columnId: string;
  afterTaskId?: string;
  beforeTaskId?: string;
};
export type DeleteTaskArgs = { projectId: string; taskId: string };

/** Lists that show task counts or due dates: refresh them after a task write succeeds. */
const AFFECTED = [{ type: ApiTag.Project, id: "LIST" }, ApiTag.Dashboard, ApiTag.Activity] as const;
const onSuccess = <T>(result: T | undefined) => (result ? [...AFFECTED] : []);

/** Changes the board's cached tasks; returns the patch (with undo). */
const patchBoard = (dispatch: AppDispatch, projectId: string, recipe: (tasks: BoardTask[]) => void) =>
  dispatch(projectsService.util.updateQueryData("getProject", projectId, (project) => recipe(project.tasks)));

/** Puts the server's version of a task into the board (replacing or adding it). */
const writeTask = (dispatch: AppDispatch, projectId: string, task: BoardTask) =>
  patchBoard(dispatch, projectId, (tasks) => {
    const index = tasks.findIndex((existing) => existing.id === task.id);
    if (index >= 0) tasks[index] = task;
    else tasks.push(task);
  });

/**
 * Ticks (moved into its project's done column) or unticks a task in every cached My tasks list.
 * It stays in its group either way; the page strikes it through while completedAt is set.
 */
function patchMyTasks(dispatch: AppDispatch, state: unknown, taskId: string, columnId: string) {
  const cached = dashboardService.util.selectCachedArgsForQuery(
    state as Parameters<typeof dashboardService.util.selectCachedArgsForQuery>[0],
    "getMyTasks"
  );
  return cached.map((day) =>
    dispatch(
      dashboardService.util.updateQueryData("getMyTasks", day, (draft) => {
        for (const task of draft.groups.flatMap((group) => group.tasks)) {
          if (task.id !== taskId) continue;
          const intoDone = task.project.doneColumnId === columnId;
          task.columnId = columnId;
          task.completedAt = intoDone ? (task.completedAt ?? new Date().toISOString()) : null;
        }
      })
    )
  );
}

export const tasksService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTask: builder.mutation<BoardTask, CreateTaskArgs>({
      query: ({ projectId, ...body }) => ({ url: `/projects/${projectId}/tasks`, method: "POST", body }),
      invalidatesTags: onSuccess,
      onQueryStarted: async ({ projectId }, { dispatch, queryFulfilled }) => {
        try {
          writeTask(dispatch, projectId, (await queryFulfilled).data);
        } catch {
          // The base query showed why; quick add keeps the text so it can be tried again.
        }
      },
    }),

    updateTask: builder.mutation<BoardTask, UpdateTaskArgs>({
      query: ({ projectId, taskId, ...body }) => ({ url: `/tasks/${taskId}`, method: "PATCH", body }),
      invalidatesTags: onSuccess,
      onQueryStarted: async ({ projectId }, { dispatch, queryFulfilled }) => {
        try {
          writeTask(dispatch, projectId, (await queryFulfilled).data);
        } catch {
          // The drawer keeps what was typed; the base query showed why it didn't save.
        }
      },
    }),

    /**
     * Optimistic: the card moves in the cache at once, with a temporary position worked out from
     * its cached neighbours (only for ordering here; the browser never sends a position) and a
     * guessed completedAt. On success the server's position and completedAt replace the guesses;
     * on failure the move is undone and the base query shows the error toast.
     */
    moveTask: builder.mutation<BoardTask, MoveTaskArgs>({
      query: ({ projectId, taskId, ...body }) => ({ url: `/tasks/${taskId}/move`, method: "PATCH", body }),
      invalidatesTags: onSuccess,
      onQueryStarted: async (args, { dispatch, getState, queryFulfilled }) => {
        const board = projectsService.endpoints.getProject.select(args.projectId)(
          getState() as Parameters<ReturnType<typeof projectsService.endpoints.getProject.select>>[0]
        ).data;
        const target = board?.columns.find((column) => column.id === args.columnId);
        const positionOf = (id?: string) => board?.tasks.find((task) => task.id === id)?.position ?? null;

        const patch = patchBoard(dispatch, args.projectId, (tasks) => {
          const task = tasks.find((candidate) => candidate.id === args.taskId);
          if (!task) return;
          const stayedInDone = task.columnId === args.columnId && task.completedAt !== null;
          task.columnId = args.columnId;
          task.position = positionBetween(positionOf(args.afterTaskId), positionOf(args.beforeTaskId));
          task.completedAt = target?.isDone ? (stayedInDone ? task.completedAt : new Date().toISOString()) : null;
        });
        // The dashboard's checkbox: tick (into the done column) or untick, in every cached copy.
        const myTaskPatches = patchMyTasks(dispatch, getState(), args.taskId, args.columnId);
        try {
          writeTask(dispatch, args.projectId, (await queryFulfilled).data);
        } catch {
          patch.undo();
          myTaskPatches.forEach((myTaskPatch) => myTaskPatch.undo());
        }
      },
    }),

    /** Sent when a delete's Undo window closes (see useDeleteTask); then the task leaves the board. */
    deleteTask: builder.mutation<DeletedResponse, DeleteTaskArgs>({
      query: ({ taskId }) => ({ url: `/tasks/${taskId}`, method: "DELETE" }),
      invalidatesTags: onSuccess,
      onQueryStarted: async ({ projectId, taskId }, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          patchBoard(dispatch, projectId, (tasks) => {
            const index = tasks.findIndex((task) => task.id === taskId);
            if (index >= 0) tasks.splice(index, 1);
          });
        } catch {
          // The task stays on the board; the base query showed why.
        }
      },
    }),
  }),
});

export const { useCreateTaskMutation, useUpdateTaskMutation, useMoveTaskMutation, useDeleteTaskMutation } =
  tasksService;
