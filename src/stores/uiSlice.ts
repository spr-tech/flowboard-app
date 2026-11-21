// Client-only UI state: things the server doesn't know and the URL doesn't need to share.
// Server data never goes here (it lives in the RTK Query cache); shareable state goes in the URL.
import { createSlice } from "@reduxjs/toolkit";

export type UiState = {
  /** The phone-sized navigation drawer (the sidebar is always visible on md and up). */
  isMobileMenuOpen: boolean;
  /** The New project dialog (opened from the projects page; a modal library is revisited in milestone 6). */
  isNewProjectDialogOpen: boolean;
};

const initialState: UiState = {
  isMobileMenuOpen: false,
  isNewProjectDialogOpen: false,
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
    newProjectDialogOpened(state) {
      state.isNewProjectDialogOpen = true;
    },
    newProjectDialogClosed(state) {
      state.isNewProjectDialogOpen = false;
    },
  },
  selectors: {
    selectIsMobileMenuOpen: (state) => state.isMobileMenuOpen,
    selectIsNewProjectDialogOpen: (state) => state.isNewProjectDialogOpen,
  },
});

export const { mobileMenuOpened, mobileMenuClosed, newProjectDialogOpened, newProjectDialogClosed } = uiSlice.actions;
export const { selectIsMobileMenuOpen, selectIsNewProjectDialogOpen } = uiSlice.selectors;
