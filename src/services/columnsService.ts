// Columns: /api/columns and /api/projects/:projectId/columns (docs/plan/04-api.md, "Columns").
// Owner only, and not optimistic: each waits for the server, then the board refetches, because
// a done-column switch or a delete also changes tasks the response doesn't include.
import type { BoardColumn, DeletedResponse } from "@/models/responses/boardResponses";
import type { DeleteColumnRequestBody } from "@/models/validations/boardValidation";
import { baseApi } from "@/configs/serviceConfig";
import { ApiTag } from "@/utilities/enums/apiTags";

export type CreateColumnArgs = { projectId: string; name: string };
export type UpdateColumnArgs = {
  projectId: string;
  columnId: string;
  name?: string;
  isDone?: true;
  move?: "left" | "right";
};
export type DeleteColumnArgs = { projectId: string; columnId: string } & DeleteColumnRequestBody;

/** The board itself, the project cards (counts) and the activity feed. */
const affected = (projectId: string) => [
  { type: ApiTag.Project, id: projectId },
  { type: ApiTag.Project, id: "LIST" },
  ApiTag.Dashboard,
  ApiTag.Activity,
];

export const columnsService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createColumn: builder.mutation<BoardColumn, CreateColumnArgs>({
      query: ({ projectId, name }) => ({ url: `/projects/${projectId}/columns`, method: "POST", body: { name } }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),

    updateColumn: builder.mutation<BoardColumn, UpdateColumnArgs>({
      query: ({ projectId, columnId, ...body }) => ({
        url: `/columns/${columnId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),

    deleteColumn: builder.mutation<DeletedResponse, DeleteColumnArgs>({
      query: ({ projectId, columnId, ...body }) => ({
        url: `/columns/${columnId}`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: (result, _error, { projectId }) => (result ? affected(projectId) : []),
    }),
  }),
});

export const { useCreateColumnMutation, useUpdateColumnMutation, useDeleteColumnMutation } = columnsService;
