// Client-only UI state: things the server doesn't know and the URL doesn't need to share.
// Server data never goes here (it lives in the RTK Query cache); shareable state goes in the URL.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** The project settings page's Danger zone dialogs. */
export type ProjectDangerDialog = "delete" | "leave";

export type UiState = {
  /** The phone-sized navigation drawer (the sidebar is always visible on md and up). */
  isMobileMenuOpen: boolean;
  /** The New project dialog (opened from the projects page; a modal library is revisited in milestone 6). */
  isNewProjectDialogOpen: boolean;
  /** Which Danger zone dialog is open on the project settings page, if any. */
  projectDangerDialog: ProjectDangerDialog | null;
};

const initialState: UiState = {
  isMobileMenuOpen: false,
  isNewProjectDialogOpen: false,
  projectDangerDialog: null,
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
    projectDangerDialogOpened(state, action: PayloadAction<ProjectDangerDialog>) {
      state.projectDangerDialog = action.payload;
    },
    projectDangerDialogClosed(state) {
      state.projectDangerDialog = null;
    },
  },
  selectors: {
    selectIsMobileMenuOpen: (state) => state.isMobileMenuOpen,
    selectIsNewProjectDialogOpen: (state) => state.isNewProjectDialogOpen,
    selectProjectDangerDialog: (state) => state.projectDangerDialog,
  },
});

export const {
  mobileMenuOpened,
  mobileMenuClosed,
  newProjectDialogOpened,
  newProjectDialogClosed,
  projectDangerDialogOpened,
  projectDangerDialogClosed,
} = uiSlice.actions;
export const { selectIsMobileMenuOpen, selectIsNewProjectDialogOpen, selectProjectDangerDialog } = uiSlice.selectors;
