// Client-only UI state: things the server doesn't know and the URL doesn't need to share.
// Server data never goes here (it lives in the RTK Query cache); shareable state goes in the URL.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * The one dialog that's open, if any. A typed slot rather than a boolean per dialog: one dialog
 * at a time, everything serializable, and a new dialog is one more line here. Radix does the
 * focus trap, Escape and overlay; this only says which dialog is showing. (The task drawer lives
 * in the URL instead, because it's shareable.)
 */
export type OpenDialog =
  | { kind: "newProject" }
  | { kind: "deleteProject" }
  | { kind: "leaveProject" }
  | { kind: "deleteColumn"; columnId: string }
  | { kind: "invite" }
  | { kind: "signOut" };

export type BoardPriorityFilter = "all" | "HIGH" | "MEDIUM" | "LOW";

export type UiState = {
  /** The phone-sized navigation drawer (the sidebar is always visible on md and up). */
  isMobileMenuOpen: boolean;
  /** The landing page's phone menu (under md). Separate from the app shell's drawer. */
  isLandingMenuOpen: boolean;
  openDialog: OpenDialog | null;
  /** Board filters: reset when the board is left, so another project never opens filtered. */
  boardPriorityFilter: BoardPriorityFilter;
  onlyMyTasks: boolean;
  /**
   * Tasks deleted but still inside their Undo window. The board and drawer hide them, so a
   * refetch during the window (focus, mount) can't bring them back. Removed when the delete
   * request finishes or fails, or Undo is clicked.
   */
  pendingDeleteTaskIds: string[];
};

const initialState: UiState = {
  isMobileMenuOpen: false,
  isLandingMenuOpen: false,
  openDialog: null,
  boardPriorityFilter: "all",
  onlyMyTasks: false,
  pendingDeleteTaskIds: [],
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
    dialogOpened(state, action: PayloadAction<OpenDialog>) {
      state.openDialog = action.payload;
    },
    dialogClosed(state) {
      state.openDialog = null;
    },
    boardPriorityFilterChanged(state, action: PayloadAction<BoardPriorityFilter>) {
      state.boardPriorityFilter = action.payload;
    },
    onlyMyTasksToggled(state) {
      state.onlyMyTasks = !state.onlyMyTasks;
    },
    boardFiltersReset(state) {
      state.boardPriorityFilter = "all";
      state.onlyMyTasks = false;
    },
    taskDeletePending(state, action: PayloadAction<string>) {
      if (!state.pendingDeleteTaskIds.includes(action.payload)) state.pendingDeleteTaskIds.push(action.payload);
    },
    taskDeleteSettled(state, action: PayloadAction<string>) {
      state.pendingDeleteTaskIds = state.pendingDeleteTaskIds.filter((id) => id !== action.payload);
    },
  },
  selectors: {
    selectIsMobileMenuOpen: (state) => state.isMobileMenuOpen,
    selectIsLandingMenuOpen: (state) => state.isLandingMenuOpen,
    selectOpenDialog: (state) => state.openDialog,
    selectBoardPriorityFilter: (state) => state.boardPriorityFilter,
    selectOnlyMyTasks: (state) => state.onlyMyTasks,
    selectPendingDeleteTaskIds: (state) => state.pendingDeleteTaskIds,
  },
});

export const {
  mobileMenuOpened,
  mobileMenuClosed,
  landingMenuToggled,
  landingMenuClosed,
  dialogOpened,
  dialogClosed,
  boardPriorityFilterChanged,
  onlyMyTasksToggled,
  boardFiltersReset,
  taskDeletePending,
  taskDeleteSettled,
} = uiSlice.actions;
export const {
  selectIsMobileMenuOpen,
  selectIsLandingMenuOpen,
  selectOpenDialog,
  selectBoardPriorityFilter,
  selectOnlyMyTasks,
  selectPendingDeleteTaskIds,
} = uiSlice.selectors;
