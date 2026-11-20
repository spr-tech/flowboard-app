// The one RTK Query API for the whole app (docs/plan/05-state.md).
//
// createApi builds a cache plus the reducer and middleware that run it. We call it exactly once:
// one cache means one place for the base URL, error handling and tag types, and tags can only
// invalidate queries in the same API, so a second API would be a cache the first can't refresh.
//
// It starts with no endpoints. Each src/services/<area>Service.ts adds its own with
// baseApi.injectEndpoints(...), so this file stays small however many endpoints there are.
import { createApi } from "@reduxjs/toolkit/query/react";

import { API_TAGS } from "@/utilities/enums/apiTags";
import { createBaseQuery } from "./baseQuery";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: createBaseQuery({ baseUrl: "/api" }),
  // Every tag any endpoint may provide or invalidate must be registered here.
  tagTypes: API_TAGS,
  endpoints: () => ({}),
  // Refetch what's on screen when the tab regains focus or the network returns
  // (needs setupListeners, in StoreProvider). Me turns the focus refetch off in its hook.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  // The default for endpoints that don't set their own (see src/utilities/constants/cacheTimes.ts).
  keepUnusedDataFor: 60,
});
