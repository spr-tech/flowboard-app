// Invites (docs/plan/04-api.md, "Members and invites"): the owner's list and actions, and the
// public link (preview, accept).
import type {
  AcceptInviteResponse,
  CancelInviteResponse,
  InvitePreview,
  InviteResponse,
  SentInviteResponse,
} from "@/models/responses/memberResponses";
import { baseApi } from "@/configs/serviceConfig";
import { CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";

const projectList = { type: ApiTag.Project, id: "LIST" } as const;

export const invitesService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listInvites: builder.query<InviteResponse[], string>({
      query: (projectId) => `/projects/${projectId}/invites`,
      providesTags: (_result, _error, projectId) => [{ type: ApiTag.Invite, id: projectId }],
      ...CACHE.members.endpoint,
    }),

    /** Answers `resent: true` when the email already had a pending invite (it was sent again). */
    createInvite: builder.mutation<SentInviteResponse, { projectId: string; email: string }>({
      query: ({ projectId, email }) => ({ url: `/projects/${projectId}/invites`, method: "POST", body: { email } }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: ApiTag.Invite, id: projectId }, ApiTag.Activity],
    }),

    resendInvite: builder.mutation<SentInviteResponse, { projectId: string; inviteId: string }>({
      query: ({ inviteId }) => ({ url: `/invites/${inviteId}/resend`, method: "POST" }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: ApiTag.Invite, id: projectId }, ApiTag.Activity],
    }),

    cancelInvite: builder.mutation<CancelInviteResponse, { projectId: string; inviteId: string }>({
      query: ({ inviteId }) => ({ url: `/invites/${inviteId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: ApiTag.Invite, id: projectId }, ApiTag.Activity],
    }),

    /** The invite page shows every state itself, so no error toasts here. */
    previewInvite: builder.query<InvitePreview, string>({
      query: (token) => `/invites/token/${encodeURIComponent(token)}`,
      extraOptions: { toast: false },
      keepUnusedDataFor: 0,
    }),

    acceptInvite: builder.mutation<AcceptInviteResponse, string>({
      query: (token) => ({ url: `/invites/token/${encodeURIComponent(token)}/accept`, method: "POST" }),
      extraOptions: { toast: false },
      invalidatesTags: [projectList, ApiTag.Dashboard, ApiTag.Activity],
    }),
  }),
});

export const { useCreateInviteMutation, useResendInviteMutation, useCancelInviteMutation, useAcceptInviteMutation } =
  invitesService;

/** The owner's pending invites (expired ones included). */
export function useInvites(projectId: string, options: { skip?: boolean } = {}) {
  return invitesService.useListInvitesQuery(projectId, { ...CACHE.members.subscription, ...options });
}

/** A link's state, checked every time the page opens: it changes once used or cancelled. */
export function useInvitePreview(token: string) {
  return invitesService.usePreviewInviteQuery(token, { refetchOnMountOrArgChange: true, refetchOnFocus: false });
}
