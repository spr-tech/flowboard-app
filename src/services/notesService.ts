// Notes on a task: /api/tasks/:taskId/notes and /api/notes/:noteId (docs/plan/04-api.md, "Notes").
// Loaded when the drawer opens, cached per task. Adding and deleting refetch the task's notes and
// the activity feed; neither is optimistic (the server decides who may delete).
import type { DeletedResponse, TaskNoteResponse } from "@/models/responses/boardResponses";
import { baseApi } from "@/configs/serviceConfig";
import { ApiTag } from "@/utilities/enums/apiTags";

export const notesService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotes: builder.query<TaskNoteResponse[], string>({
      query: (taskId) => `/tasks/${taskId}/notes`,
      providesTags: (_result, _error, taskId) => [{ type: ApiTag.Note, id: taskId }],
    }),

    addNote: builder.mutation<TaskNoteResponse, { taskId: string; body: string }>({
      query: ({ taskId, body }) => ({ url: `/tasks/${taskId}/notes`, method: "POST", body: { body } }),
      invalidatesTags: (result, _error, { taskId }) =>
        result ? [{ type: ApiTag.Note, id: taskId }, ApiTag.Activity] : [],
    }),

    deleteNote: builder.mutation<DeletedResponse, { taskId: string; noteId: string }>({
      query: ({ noteId }) => ({ url: `/notes/${noteId}`, method: "DELETE" }),
      invalidatesTags: (result, _error, { taskId }) =>
        result ? [{ type: ApiTag.Note, id: taskId }, ApiTag.Activity] : [],
    }),
  }),
});

export const { useListNotesQuery, useAddNoteMutation, useDeleteNoteMutation } = notesService;
