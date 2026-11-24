// Tasks: /api/tasks and /api/projects/:projectId/tasks (docs/plan/04-api.md, "Tasks").
//
// The board lives in the getProject cache entry (projectsService), so every task write updates
// that entry with the task the server returns, instead of refetching the whole board.
// moveTask is optimistic (docs/plan/05-state.md): the card lands before the server answers. The
// board only starts a move that can() allows, so an optimistic update never starts for a forbidden
// action. "Assign to me" (takeTask) waits for the server: the take limit is checked there.
import type { BoardTask, DeletedResponse } from "@/models/responses/boardResponses";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { baseApi } from "@/configs/serviceConfig";
import type { AppDispatch } from "@/stores/store";
import { ApiTag } from "@/utilities/enums/apiTags";
import { orderCards, withCardPlaced } from "@/utilities/helpers/cardOrder";
import { aboveIndexFor, positionBetween } from "@/utilities/helpers/position";
import { dashboardService } from "./dashboardService";
import { projectsService } from "./projectsService";

export type CreateTaskArgs = {
  projectId: string;
  title: string;
  columnId: string;
  /** A member's form: 20+ characters, and an optional due date (set once). */
  description?: string | null;
  dueDate?: string | null;
};
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
  /**
   * I work in my own card order (members; managers who can't change the team task order): the
   * neighbours are in my order, and the card goes to the top of the team order. Not sent.
   */
  personal?: boolean;
  /** Who I am, for my count of open taken tasks. Not sent. */
  meId?: string;
};
export type TaskArgs = { projectId: string; taskId: string };
export type DeleteTaskArgs = { projectId: string; taskId: string };

/** Lists that show task counts or due dates: refresh them after a task write succeeds. */
const AFFECTED = [{ type: ApiTag.Project, id: "LIST" }, ApiTag.Dashboard, ApiTag.Activity] as const;
const onSuccess = <T>(result: T | undefined) => (result ? [...AFFECTED] : []);

/** Changes the board's cached tasks; returns the patch (with undo). */
const patchBoard = (dispatch: AppDispatch, projectId: string, recipe: (tasks: BoardTask[]) => void) =>
  dispatch(projectsService.util.updateQueryData("getProject", projectId, (project) => recipe(project.tasks)));

/** Changes the whole cached board (tasks and my membership); returns the patch (with undo). */
const patchProject = (dispatch: AppDispatch, projectId: string, recipe: (project: ProjectDetail) => void) =>
  dispatch(projectsService.util.updateQueryData("getProject", projectId, recipe));

/** Open tasks I took from the pool count toward the take limit; done ones don't. */
const isOpenTake = (task: BoardTask, meId: string | undefined, project: ProjectDetail) =>
  task.takenFromPool &&
  task.assignee?.id === meId &&
  !project.columns.find((column) => column.id === task.columnId)?.isDone;

/**
 * A personal mover's card in the cache: where they dropped it in their own order, and at the top
 * of the target column's team order (as the server will put it).
 */
function placePersonally(project: ProjectDetail, args: MoveTaskArgs) {
  const { meId } = args;
  const task = project.tasks.find((candidate) => candidate.id === args.taskId);
  if (!task) return;
  const teamOthers = project.tasks
    .filter((other) => other.columnId === args.columnId && other.id !== args.taskId)
    .sort((a, b) => a.position - b.position);
  const myOthers = orderCards(teamOthers, project.me.cardOrder?.[args.columnId]).map((other) => other.id);
  const aboveIndex = aboveIndexFor(myOthers, args.afterTaskId, args.beforeTaskId) ?? myOthers.length - 1;
  project.me.cardOrder = withCardPlaced(project.me.cardOrder, myOthers, {
    taskId: args.taskId,
    index: aboveIndex + 1,
    toColumnId: args.columnId,
    fromColumnId: task.columnId,
  });
  const wasOpenTake = isOpenTake(task, meId, project);
  task.columnId = args.columnId;
  task.position = positionBetween(null, teamOthers[0]?.position ?? null);
  const isOpenNow = isOpenTake(task, meId, project);
  if (wasOpenTake !== isOpenNow) project.me.takenOpenCount += isOpenNow ? 1 : -1;
}

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
      query: ({ projectId, taskId, personal, meId, ...body }) => ({
        url: `/tasks/${taskId}/move`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: onSuccess,
      onQueryStarted: async (args, { dispatch, getState, queryFulfilled }) => {
        const board = projectsService.endpoints.getProject.select(args.projectId)(
          getState() as Parameters<ReturnType<typeof projectsService.endpoints.getProject.select>>[0]
        ).data;
        const target = board?.columns.find((column) => column.id === args.columnId);
        const positionOf = (id?: string) => board?.tasks.find((task) => task.id === id)?.position ?? null;

        const patch = patchProject(dispatch, args.projectId, (project) => {
          const task = project.tasks.find((candidate) => candidate.id === args.taskId);
          if (!task) return;
          const stayedInDone = task.columnId === args.columnId && task.completedAt !== null;
          if (args.personal) placePersonally(project, args);
          else {
            task.columnId = args.columnId;
            task.position = positionBetween(positionOf(args.afterTaskId), positionOf(args.beforeTaskId));
          }
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

    /**
     * "Assign to me". Not optimistic: the server checks the take limit and that nobody got there
     * first. On success the card is mine, and my count of open taken tasks goes up.
     */
    takeTask: builder.mutation<BoardTask, TaskArgs>({
      query: ({ taskId }) => ({ url: `/tasks/${taskId}/take`, method: "POST" }),
      invalidatesTags: onSuccess,
      onQueryStarted: async ({ projectId }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          patchProject(dispatch, projectId, (project) => {
            const index = project.tasks.findIndex((task) => task.id === data.id);
            if (index >= 0) project.tasks[index] = data;
            project.me.takenOpenCount += 1;
          });
        } catch {
          // The base query showed why (the take limit, or someone got there first).
        }
      },
    }),

    /** The owner opened a member's new task: the "New" badge goes at once. */
    markTaskSeen: builder.mutation<BoardTask, TaskArgs>({
      query: ({ taskId }) => ({ url: `/tasks/${taskId}/seen`, method: "POST" }),
      onQueryStarted: async ({ projectId, taskId }, { dispatch, queryFulfilled }) => {
        const patch = patchBoard(dispatch, projectId, (tasks) => {
          const task = tasks.find((candidate) => candidate.id === taskId);
          if (task) task.newForOwner = false;
        });
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
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

export const {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
  useTakeTaskMutation,
  useMarkTaskSeenMutation,
} = tasksService;
