// The Redux store. A function, not a module-level `store`: on the server one module is shared by
// every request, so a single store there could hold one user's data while rendering another's
// page. StoreProvider calls makeStore() once per browser tab instead.
import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { baseApi } from "@/configs/serviceConfig";
import { uiSlice } from "./uiSlice";

// The API is a slice too: its reducer holds the RTK Query cache under state.api.
const rootReducer = combineSlices(uiSlice, baseApi);

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    // The API middleware runs the cache: starts requests, counts subscribers, removes unused
    // data after keepUnusedDataFor, and refetches when tags are invalidated.
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
