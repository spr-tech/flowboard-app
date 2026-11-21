import { describe, expect, it } from "vitest";

import { makeStore } from "./store";
import {
  boardFiltersReset,
  boardPriorityFilterChanged,
  dialogClosed,
  dialogOpened,
  landingMenuClosed,
  landingMenuToggled,
  mobileMenuClosed,
  mobileMenuOpened,
  onlyMyTasksToggled,
  selectBoardPriorityFilter,
  selectIsLandingMenuOpen,
  selectIsMobileMenuOpen,
  selectOnlyMyTasks,
  selectOpenDialog,
  selectPendingDeleteTaskIds,
  taskDeletePending,
  taskDeleteSettled,
  uiSlice,
} from "./uiSlice";

describe("uiSlice", () => {
  it("starts with every menu and dialog closed, no filters and nothing pending", () => {
    expect(uiSlice.getInitialState()).toEqual({
      isMobileMenuOpen: false,
      isLandingMenuOpen: false,
      openDialog: null,
      boardPriorityFilter: "all",
      onlyMyTasks: false,
      pendingDeleteTaskIds: [],
    });
  });

  it("opens one dialog at a time and closes it", () => {
    const store = makeStore();

    store.dispatch(dialogOpened({ kind: "newProject" }));
    expect(selectOpenDialog(store.getState())).toEqual({ kind: "newProject" });

    store.dispatch(dialogOpened({ kind: "deleteColumn", columnId: "c1" }));
    expect(selectOpenDialog(store.getState())).toEqual({ kind: "deleteColumn", columnId: "c1" });

    store.dispatch(dialogClosed());
    expect(selectOpenDialog(store.getState())).toBeNull();
  });

  it("sets the board filters and resets them together", () => {
    const store = makeStore();

    store.dispatch(boardPriorityFilterChanged("HIGH"));
    store.dispatch(onlyMyTasksToggled());
    expect(selectBoardPriorityFilter(store.getState())).toBe("HIGH");
    expect(selectOnlyMyTasks(store.getState())).toBe(true);

    store.dispatch(boardFiltersReset());
    expect(selectBoardPriorityFilter(store.getState())).toBe("all");
    expect(selectOnlyMyTasks(store.getState())).toBe(false);
  });

  it("keeps each pending delete once, and drops it when settled", () => {
    const store = makeStore();

    store.dispatch(taskDeletePending("t1"));
    store.dispatch(taskDeletePending("t1"));
    store.dispatch(taskDeletePending("t2"));
    expect(selectPendingDeleteTaskIds(store.getState())).toEqual(["t1", "t2"]);

    store.dispatch(taskDeleteSettled("t1"));
    expect(selectPendingDeleteTaskIds(store.getState())).toEqual(["t2"]);
  });

  it("opens and closes the mobile menu", () => {
    const opened = uiSlice.reducer(undefined, mobileMenuOpened());
    expect(opened.isMobileMenuOpen).toBe(true);

    expect(uiSlice.reducer(opened, mobileMenuClosed()).isMobileMenuOpen).toBe(false);
  });

  it("toggles and closes the landing menu, separately from the app's drawer", () => {
    const store = makeStore();

    store.dispatch(landingMenuToggled());
    expect(selectIsLandingMenuOpen(store.getState())).toBe(true);
    expect(selectIsMobileMenuOpen(store.getState())).toBe(false);

    store.dispatch(landingMenuToggled());
    expect(selectIsLandingMenuOpen(store.getState())).toBe(false);

    store.dispatch(landingMenuToggled());
    store.dispatch(landingMenuClosed());
    expect(selectIsLandingMenuOpen(store.getState())).toBe(false);
  });

  it("gives every store its own state", () => {
    const first = makeStore();
    const second = makeStore();

    first.dispatch(mobileMenuOpened());

    expect(selectIsMobileMenuOpen(second.getState())).toBe(false);
  });
});
