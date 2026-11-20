// Client-only UI state: things the server doesn't know and the URL doesn't need to share.
// Server data never goes here (it lives in the RTK Query cache); shareable state goes in the URL.
import { createSlice } from "@reduxjs/toolkit";

export type UiState = {
  /** The phone-sized navigation drawer (the sidebar is always visible on md and up). */
  isMobileMenuOpen: boolean;
};

const initialState: UiState = {
  isMobileMenuOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Redux Toolkit lets reducers "mutate" the draft; it produces a new object for us (Immer).
    mobileMenuOpened(state) {
      state.isMobileMenuOpen = true;
    },
    mobileMenuClosed(state) {
      state.isMobileMenuOpen = false;
    },
  },
  selectors: {
    selectIsMobileMenuOpen: (state) => state.isMobileMenuOpen,
  },
});

export const { mobileMenuOpened, mobileMenuClosed } = uiSlice.actions;
export const { selectIsMobileMenuOpen } = uiSlice.selectors;
