// Project members: /api/projects/:projectId/members (docs/plan/04-api.md, "Members and invites").
// The list (milestone 5) and removing a member (milestone 7). Invites: invitesService.ts.
import type { MemberRoleResponse, RemoveMemberResponse } from "@/models/responses/memberResponses";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { baseApi } from "@/configs/serviceConfig";
import { CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";
import type { ManagerPermissions } from "@/utilities/helpers/permissions";

/** A role or a manager's switches changed: the list, the board (members, my rights) and the feed. */
const roleChanged = (projectId: string) => [
  { type: ApiTag.Member, id: projectId },
  { type: ApiTag.Project, id: projectId },
  ApiTag.Activity,
];

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

    /** Owner: promote to manager (default switches) or demote to member. */
    setMemberRole: builder.mutation<
      MemberRoleResponse,
      { projectId: string; userId: string; role: "MANAGER" | "MEMBER" }
    >({
      query: ({ projectId, userId, role }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (result, _error, { projectId }) => (result ? roleChanged(projectId) : []),
    }),

    /** Owner: turn a manager's switches on or off. Saves on each change. */
    setManagerPermissions: builder.mutation<
      MemberRoleResponse,
      { projectId: string; userId: string } & Partial<ManagerPermissions>
    >({
      query: ({ projectId, userId, ...body }) => ({
        url: `/projects/${projectId}/members/${userId}/permissions`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _error, { projectId }) => (result ? roleChanged(projectId) : []),
    }),
  }),
});

export const { useRemoveMemberMutation, useSetMemberRoleMutation, useSetManagerPermissionsMutation } = membersService;

/** Everyone on the project (owner, managers, members), with their task counts and switches. */
export function useMembers(projectId: string, options: { skip?: boolean } = {}) {
  return membersService.useListMembersQuery(projectId, { ...CACHE.members.subscription, ...options });
}
