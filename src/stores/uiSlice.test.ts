import { describe, expect, it } from "vitest";

import { makeStore } from "./store";
import {
  mobileMenuClosed,
  mobileMenuOpened,
  newProjectDialogClosed,
  newProjectDialogOpened,
  selectIsMobileMenuOpen,
  selectIsNewProjectDialogOpen,
  uiSlice,
} from "./uiSlice";

describe("uiSlice", () => {
  it("starts with the mobile menu and the New project dialog closed", () => {
    expect(uiSlice.getInitialState()).toEqual({ isMobileMenuOpen: false, isNewProjectDialogOpen: false });
  });

  it("opens and closes the New project dialog", () => {
    const store = makeStore();

    store.dispatch(newProjectDialogOpened());
    expect(selectIsNewProjectDialogOpen(store.getState())).toBe(true);

    store.dispatch(newProjectDialogClosed());
    expect(selectIsNewProjectDialogOpen(store.getState())).toBe(false);
  });

  it("opens and closes the mobile menu", () => {
    const opened = uiSlice.reducer(undefined, mobileMenuOpened());
    expect(opened.isMobileMenuOpen).toBe(true);

    expect(uiSlice.reducer(opened, mobileMenuClosed()).isMobileMenuOpen).toBe(false);
  });

  it("is wired into the store, with a selector that reads it", () => {
    const store = makeStore();
    expect(selectIsMobileMenuOpen(store.getState())).toBe(false);

    store.dispatch(mobileMenuOpened());

    expect(selectIsMobileMenuOpen(store.getState())).toBe(true);
  });

  it("gives every store its own state", () => {
    const first = makeStore();
    const second = makeStore();

    first.dispatch(mobileMenuOpened());

    expect(selectIsMobileMenuOpen(second.getState())).toBe(false);
  });
});
