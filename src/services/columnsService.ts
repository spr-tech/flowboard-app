// Columns: /api/columns and /api/projects/:projectId/columns (docs/plan/04-api.md, "Columns").
//
// Create, rename, set done and delete wait for the server, then the board refetches (a done-column
// switch or a delete also changes tasks). The two kinds of column move are optimistic, like card
// moves: the owner's moveColumn changes the team order, a member's setColumnOrder only their view.
import type { BoardColumn, DeletedResponse } from "@/models/responses/boardResponses";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import type { DeleteColumnRequestBody } from "@/models/validations/boardValidation";
import { baseApi } from "@/configs/serviceConfig";
import type { AppDispatch } from "@/stores/store";
import { ApiTag } from "@/utilities/enums/apiTags";
import { positionBetween } from "@/utilities/helpers/position";
import { projectsService } from "./projectsService";

export type CreateColumnArgs = { projectId: string; name: string };
export type UpdateColumnArgs = { projectId: string; columnId: string; name?: string; isDone?: true };
export type MoveColumnArgs = { projectId: string; columnId: string; afterColumnId?: string; beforeColumnId?: string };
export type ColumnOrderArgs = { projectId: string; columnIds: string[] };
export type DeleteColumnArgs = { projectId: string; columnId: string } & DeleteColumnRequestBody;
type ColumnOrderResponse = { projectId: string; columnOrder: string[] | null };

/** The board itself, the project cards (counts) and the activity feed. */
const affected = (projectId: string) => [
  { type: ApiTag.Project, id: projectId },
  { type: ApiTag.Project, id: "LIST" },
  ApiTag.Dashboard,
  ApiTag.Activity,
];

const patchBoard = (dispatch: AppDispatch, projectId: string, recipe: (project: ProjectDetail) => void) =>
  dispatch(projectsService.util.updateQueryData("getProject", projectId, recipe));

/** Keeps the cached columns in the team order after a position changed. */
const sortByPosition = (project: ProjectDetail) => project.columns.sort((a, b) => a.position - b.position);

export const columnsService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createColumn: builder.mutation<BoardColumn, CreateColumnArgs>({
      query: ({ projectId, name }) => ({ url: `/projects/${projectId}/columns`, method: "POST", body: { name } }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),

    updateColumn: builder.mutation<BoardColumn, UpdateColumnArgs>({
      query: ({ projectId, columnId, ...body }) => ({ url: `/columns/${columnId}`, method: "PATCH", body }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),

    /**
     * The owner moves a column in the team order. Optimistic: a temporary position from the
     * cached neighbours (never sent), the server's position on success, undo on failure.
     */
    moveColumn: builder.mutation<BoardColumn, MoveColumnArgs>({
      query: ({ projectId, columnId, ...body }) => ({ url: `/columns/${columnId}/move`, method: "PATCH", body }),
      invalidatesTags: (result) => (result ? [ApiTag.Activity] : []),
      onQueryStarted: async ({ projectId, columnId, afterColumnId, beforeColumnId }, { dispatch, queryFulfilled }) => {
        const patch = patchBoard(dispatch, projectId, (project) => {
          const positionOf = (id?: string) => project.columns.find((column) => column.id === id)?.position ?? null;
          const column = project.columns.find((candidate) => candidate.id === columnId);
          if (!column) return;
          column.position = positionBetween(positionOf(afterColumnId), positionOf(beforeColumnId));
          sortByPosition(project);
        });
        try {
          const { data } = await queryFulfilled;
          patchBoard(dispatch, projectId, (project) => {
            const column = project.columns.find((candidate) => candidate.id === columnId);
            if (column) column.position = data.position;
            sortByPosition(project);
          });
        } catch {
          patch.undo();
        }
      },
    }),

    /** A member's own column order. Optimistic, like the team move. */
    setColumnOrder: builder.mutation<ColumnOrderResponse, ColumnOrderArgs>({
      query: ({ projectId, columnIds }) => ({
        url: `/projects/${projectId}/column-order`,
        method: "PUT",
        body: { columnIds },
      }),
      onQueryStarted: async ({ projectId, columnIds }, { dispatch, queryFulfilled }) => {
        const patch = patchBoard(dispatch, projectId, (project) => {
          project.me.columnOrder = columnIds;
        });
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    /** Back to the team order. Optimistic. */
    resetColumnOrder: builder.mutation<ColumnOrderResponse, string>({
      query: (projectId) => ({ url: `/projects/${projectId}/column-order`, method: "DELETE" }),
      onQueryStarted: async (projectId, { dispatch, queryFulfilled }) => {
        const patch = patchBoard(dispatch, projectId, (project) => {
          project.me.columnOrder = null;
        });
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    deleteColumn: builder.mutation<DeletedResponse, DeleteColumnArgs>({
      query: ({ projectId, columnId, ...body }) => ({ url: `/columns/${columnId}`, method: "DELETE", body }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),
  }),
});

export const {
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useMoveColumnMutation,
  useSetColumnOrderMutation,
  useResetColumnOrderMutation,
  useDeleteColumnMutation,
} = columnsService;
