// Project members: /api/projects/:projectId/members (docs/plan/04-api.md, "Members and invites").
// The list (milestone 5) and removing a member (milestone 7). Invites: invitesService.ts.
import type { RemoveMemberResponse } from "@/models/responses/memberResponses";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { baseApi } from "@/configs/serviceConfig";
import { CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";

export const membersService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMembers: builder.query<ProjectMemberResponse[], string>({
      query: (projectId) => `/projects/${projectId}/members`,
      providesTags: (_result, _error, projectId) => [{ type: ApiTag.Member, id: projectId }],
      ...CACHE.members.endpoint,
    }),

    /** Their tasks here become unassigned, so the board (and its avatars) refetch too. */
    removeMember: builder.mutation<RemoveMemberResponse, { projectId: string; userId: string }>({
      query: ({ projectId, userId }) => ({ url: `/projects/${projectId}/members/${userId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: ApiTag.Member, id: projectId },
        { type: ApiTag.Project, id: projectId },
        { type: ApiTag.Project, id: "LIST" },
        ApiTag.Dashboard,
        ApiTag.Activity,
      ],
    }),
  }),
});

export const { useRemoveMemberMutation } = membersService;

/** Everyone on the project, owner first, with their task counts. */
export function useMembers(projectId: string, options: { skip?: boolean } = {}) {
  return membersService.useListMembersQuery(projectId, { ...CACHE.members.subscription, ...options });
}
