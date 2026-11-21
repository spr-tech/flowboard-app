// Project members: /api/projects/:projectId/members (docs/plan/04-api.md, "Members and invites").
// Read-only in milestone 5 (the Leave dialog counts my tasks); milestone 7 adds invites and removal.
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
  }),
});

/** Everyone on the project, owner first, with their task counts. */
export function useMembers(projectId: string, options: { skip?: boolean } = {}) {
  return membersService.useListMembersQuery(projectId, { ...CACHE.members.subscription, ...options });
}
