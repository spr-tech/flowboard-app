// The Redux store. A function, not a module-level `store`: on the server one module is shared by
// every request, so a single store there could hold one user's data while rendering another's
// page. StoreProvider calls makeStore() once per browser tab instead.
import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { uiSlice } from "./uiSlice";

const rootReducer = combineSlices(uiSlice);

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
