// Client-only UI state: things the server doesn't know and the URL doesn't need to share.
// Server data never goes here (it lives in the RTK Query cache); shareable state goes in the URL.
import { createSlice } from "@reduxjs/toolkit";

export type UiState = {
  /** The phone-sized navigation drawer (the sidebar is always visible on md and up). */
  isMobileMenuOpen: boolean;
  /** The landing page's phone menu (under md). Separate from the app shell's drawer. */
  isLandingMenuOpen: boolean;
};

const initialState: UiState = {
  isMobileMenuOpen: false,
  isLandingMenuOpen: false,
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
    landingMenuToggled(state) {
      state.isLandingMenuOpen = !state.isLandingMenuOpen;
    },
    landingMenuClosed(state) {
      state.isLandingMenuOpen = false;
    },
  },
  selectors: {
    selectIsMobileMenuOpen: (state) => state.isMobileMenuOpen,
    selectIsLandingMenuOpen: (state) => state.isLandingMenuOpen,
  },
});

export const { mobileMenuOpened, mobileMenuClosed, landingMenuToggled, landingMenuClosed } = uiSlice.actions;
export const { selectIsMobileMenuOpen, selectIsLandingMenuOpen } = uiSlice.selectors;
