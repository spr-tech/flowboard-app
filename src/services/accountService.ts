// The signed-in user's account: /api/me (docs/plan/04-api.md, "Account").
//
// injectEndpoints adds these endpoints to the one baseApi from src/configs/serviceConfig.ts
// instead of creating a second API. Same cache, same error handling, same tags, so a later
// "rename me" mutation can invalidate the Me tag and every screen showing the name updates.
import type { MeResponse } from "@/models/responses/meResponses";
import { baseApi } from "@/configs/serviceConfig";
import { CACHE } from "@/utilities/constants/cacheTimes";
import { ApiTag } from "@/utilities/enums/apiTags";

const controller = "me";

export const accountService = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // A query reads (cached, shared by every component that asks); a mutation writes.
    getMe: builder.query<MeResponse, void>({
      query: () => `/${controller}`,
      // "This result is the Me data": anything that invalidates Me makes this refetch.
      providesTags: [ApiTag.Me],
      // Keep it 10 minutes after the last screen using it goes away (see cacheTimes.ts).
      ...CACHE.me.endpoint,
    }),
  }),
});

const { useGetMeQuery } = accountService;

/**
 * The signed-in user, from the cache when it's there. Components call this, not useGetMeQuery,
 * so Me's subscription settings (no refetch on mount or focus) apply everywhere.
 */
export function useMe() {
  return useGetMeQuery(undefined, CACHE.me.subscription);
}
