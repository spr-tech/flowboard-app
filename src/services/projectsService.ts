// Projects: /api/projects (docs/plan/04-api.md, "Projects"; docs/plan/05-state.md).
//
// The list is cached per `today` (it changes the overdue counts), so the pin mutations patch
// every cached copy of it, plus the single project if that's cached too.
import type {
  ListProjectsRequest,
  CreateProjectRequest,
  DeleteProjectRequest,
  UpdateProjectRequest,
} from "@/models/requests/projectRequests";
import type {
  DeleteProjectResponse,
  LeaveProjectResponse,
  MyMembership,
  ProjectDetail,
  ProjectMembershipResponse,
  ProjectSummary,
} from "@/models/responses/projectResponses";
import { baseApi } from "@/configs/serviceConfig";
import type { AppDispatch } from "@/stores/store";
import { CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";
import { localToday } from "@/utilities/helpers/localToday";

const controller = "projects";

/** The whole list, as opposed to one project's id. */
const LIST = { type: ApiTag.Project, id: "LIST" } as const;

/** Writes the server's view of my membership onto a cached one (an Immer draft). */
function copyMembership(me: MyMembership, from: MyMembership) {
  me.role = from.role;
  me.pinnedAt = from.pinnedAt;
  me.lastOpenedAt = from.lastOpenedAt;
  me.joinedAt = from.joinedAt;
}

/** Changes my membership in every cached copy of a project; returns a function that undoes it. */
type PatchMembership = (projectId: string, change: (me: MyMembership) => void) => () => void;

/**
 * Pins and unpins change the cache straight away and wait for the server afterwards.
 * Success: the server's membership replaces the guess (its clock decides the pin order).
 * Failure: the guess is undone; the base query has already shown the error toast.
 */
async function updateOptimistically(
  projectId: string,
  queryFulfilled: Promise<{ data: ProjectMembershipResponse }>,
  patch: PatchMembership,
  change: (me: MyMembership) => void
) {
  const undo = patch(projectId, change);
  try {
    const { data } = await queryFulfilled;
    patch(projectId, (me) => copyMembership(me, data));
  } catch {
    undo();
  }
}

export const projectsService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProjects: builder.query<ProjectSummary[], ListProjectsRequest>({
      query: ({ today }) => ({ url: `/${controller}`, params: { today } }),
      // The list as a whole, and each project in it: renaming one project refreshes the list.
      providesTags: (result) => [LIST, ...(result ?? []).map(({ id }) => ({ type: ApiTag.Project, id }))],
      ...CACHE.projects.endpoint,
    }),

    getProject: builder.query<ProjectDetail, string>({
      query: (projectId) => `/${controller}/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: ApiTag.Project, id: projectId }],
      ...CACHE.projects.endpoint,
      // Opening a project records the visit first, so `me.lastOpenedAt` here is fresh. Copying it
      // into the cached list keeps the sidebar's "recently opened" right without a refetch.
      onQueryStarted: async (projectId, { dispatch, getState, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          membershipPatcher(dispatch, getState)(projectId, (me) => copyMembership(me, data.me));
        } catch {
          // A failed load changes nothing in the list.
        }
      },
    }),

    createProject: builder.mutation<ProjectDetail, CreateProjectRequest>({
      query: (body) => ({ url: `/${controller}`, method: "POST", body }),
      invalidatesTags: [LIST, ApiTag.Dashboard],
    }),

    updateProject: builder.mutation<ProjectDetail, UpdateProjectRequest>({
      query: ({ projectId, ...body }) => ({ url: `/${controller}/${projectId}`, method: "PATCH", body }),
      // The write returns the updated project: put it straight into that project's cache entry,
      // and refetch only the list (its cards carry counts the response doesn't have).
      invalidatesTags: [LIST, ApiTag.Dashboard],
      onQueryStarted: async ({ projectId }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            projectsService.util.updateQueryData("getProject", projectId, (project) => Object.assign(project, data))
          );
        } catch {
          // The base query has shown the error; the cache is unchanged.
        }
      },
    }),

    // Not the project's own tag: refetching a deleted (or left) project would be a 404 toast.
    // The screen leaves for /projects, and the list refetches.
    deleteProject: builder.mutation<DeleteProjectResponse, DeleteProjectRequest>({
      query: ({ projectId, name }) => ({ url: `/${controller}/${projectId}`, method: "DELETE", body: { name } }),
      invalidatesTags: [LIST, ApiTag.Dashboard, ApiTag.Activity],
    }),

    leaveProject: builder.mutation<LeaveProjectResponse, string>({
      query: (projectId) => ({ url: `/${controller}/${projectId}/leave`, method: "POST" }),
      invalidatesTags: [LIST, ApiTag.Dashboard, ApiTag.Activity, ApiTag.Member],
    }),

    pinProject: builder.mutation<ProjectMembershipResponse, string>({
      query: (projectId) => ({ url: `/${controller}/${projectId}/pin`, method: "POST" }),
      onQueryStarted: (projectId, { dispatch, getState, queryFulfilled }) =>
        // Pinning again keeps the first pin's time, as the server does.
        updateOptimistically(projectId, queryFulfilled, membershipPatcher(dispatch, getState), (me) => {
          me.pinnedAt ??= new Date().toISOString();
        }),
    }),

    unpinProject: builder.mutation<ProjectMembershipResponse, string>({
      query: (projectId) => ({ url: `/${controller}/${projectId}/pin`, method: "DELETE" }),
      onQueryStarted: (projectId, { dispatch, getState, queryFulfilled }) =>
        updateOptimistically(projectId, queryFulfilled, membershipPatcher(dispatch, getState), (me) => {
          me.pinnedAt = null;
        }),
    }),
  }),
});

type CacheState = Parameters<typeof projectsService.util.selectCachedArgsForQuery>[0];

/** PatchMembership over the RTK Query cache: every cached list, and the project if cached. */
function membershipPatcher(dispatch: AppDispatch, getState: () => unknown): PatchMembership {
  return (projectId, change) => {
    const state = getState() as CacheState;
    const { selectCachedArgsForQuery, updateQueryData } = projectsService.util;
    const patches = [
      ...selectCachedArgsForQuery(state, "listProjects").map((args) =>
        dispatch(
          updateQueryData("listProjects", args, (projects) => {
            const project = projects.find(({ id }) => id === projectId);
            if (project) change(project.me);
          })
        )
      ),
      ...selectCachedArgsForQuery(state, "getProject")
        .filter((id) => id === projectId)
        .map((id) => dispatch(updateQueryData("getProject", id, (project) => change(project.me)))),
    ];
    return () => patches.forEach((patch) => patch.undo());
  };
}

export const {
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useLeaveProjectMutation,
  usePinProjectMutation,
  useUnpinProjectMutation,
} = projectsService;

/** My projects, with the projects cache settings and the browser's own `today`. */
export function useProjects() {
  return projectsService.useListProjectsQuery({ today: localToday() }, CACHE.projects.subscription);
}

/** One project (its settings page; the board in milestone 6). */
export function useProject(projectId: string) {
  return useGetProjectQuery(projectId, CACHE.projects.subscription);
}
