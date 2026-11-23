// The dashboard (docs/plan/04-api.md, "Dashboard"; 05-state.md, cache and polling). Each section
// is its own query, so each loads (and shows its skeleton) on its own. All but the feeds send the
// browser's day and time zone; they're part of the cache key, so a new day is a new entry.
import type {
  ActivityItem,
  ActivityPage,
  DashboardProject,
  DashboardStats,
  DashboardSummary,
  MyTasksResponse,
} from "@/models/responses/dashboardResponses";
import { ACTIVITY_PAGE_SIZE, type DashboardQuery } from "@/models/validations/dashboardValidation";
import { baseApi } from "@/configs/serviceConfig";
import { ACTIVITY_POLLING, CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";
import { localToday } from "@/utilities/helpers/localToday";

const withDay = (path: string, { today, tz }: DashboardQuery, extra = "") =>
  `${path}?today=${today}&tz=${encodeURIComponent(tz)}${extra}`;

export const dashboardService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<DashboardSummary, DashboardQuery>({
      query: (day) => withDay("/dashboard/summary", day),
      providesTags: [ApiTag.Dashboard],
      ...CACHE.dashboard.endpoint,
    }),
    getMyTasks: builder.query<MyTasksResponse, DashboardQuery>({
      query: (day) => withDay("/me/tasks", day, "&group=due"),
      providesTags: [ApiTag.Dashboard],
      ...CACHE.dashboard.endpoint,
    }),
    getDashboardProjects: builder.query<DashboardProject[], DashboardQuery>({
      query: (day) => withDay("/dashboard/projects", day),
      providesTags: [ApiTag.Dashboard],
      ...CACHE.dashboard.endpoint,
    }),
    getStats: builder.query<DashboardStats, DashboardQuery>({
      query: (day) => withDay("/dashboard/stats", day),
      providesTags: [ApiTag.Dashboard],
      ...CACHE.dashboard.endpoint,
    }),
    /** One page of 5; cursor null is the first page (the newest). */
    getTeamActivity: builder.query<ActivityPage, { cursor: string | null }>({
      query: ({ cursor }) =>
        `/dashboard/activity?limit=${ACTIVITY_PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      providesTags: [ApiTag.Activity],
      ...CACHE.activity.endpoint,
    }),
    getTaskActivity: builder.query<ActivityItem[], string>({
      query: (taskId) => `/tasks/${taskId}/activity`,
      providesTags: (_result, _error, taskId) => [ApiTag.Activity, { type: ApiTag.Activity, id: taskId }],
      ...CACHE.activity.endpoint,
    }),
  }),
});

/** The browser's day and zone, which every dashboard section is computed against. */
export function useDashboardDay(): DashboardQuery {
  return { today: localToday(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

export function useDashboardSummary(day: DashboardQuery) {
  return dashboardService.useGetSummaryQuery(day, CACHE.dashboard.subscription);
}

export function useMyTasks(day: DashboardQuery, options: { skip?: boolean } = {}) {
  return dashboardService.useGetMyTasksQuery(day, { ...CACHE.dashboard.subscription, ...options });
}

export function useDashboardProjects(day: DashboardQuery, options: { skip?: boolean } = {}) {
  return dashboardService.useGetDashboardProjectsQuery(day, { ...CACHE.dashboard.subscription, ...options });
}

export function useDashboardStats(day: DashboardQuery, options: { skip?: boolean } = {}) {
  return dashboardService.useGetStatsQuery(day, { ...CACHE.dashboard.subscription, ...options });
}

/**
 * One page of team activity. Only the first page (cursor null) polls, every 30 seconds while the
 * tab is visible: an older page never moves under the reader.
 */
export function useTeamActivity(cursor: string | null, options: { skip?: boolean } = {}) {
  return dashboardService.useGetTeamActivityQuery(
    { cursor },
    { ...CACHE.activity.subscription, ...(cursor === null ? ACTIVITY_POLLING : {}), ...options }
  );
}

export function useTaskActivity(taskId: string) {
  return dashboardService.useGetTaskActivityQuery(taskId, CACHE.activity.subscription);
}
