import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScrollLock } from "./useScrollLock";

describe("useScrollLock", () => {
  beforeEach(() => {
    // jsdom doesn't scroll; pretend the page is 640px down and record where it's sent.
    vi.spyOn(window, "scrollY", "get").mockReturnValue(640);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(); // Unmount (and unlock) while scrollTo is still mocked.
    vi.restoreAllMocks();
    document.body.removeAttribute("style");
  });

  it("does nothing while unlocked", () => {
    renderHook(() => useScrollLock(false));

    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("pins the body where the page was scrolled to", () => {
    renderHook(() => useScrollLock(true));

    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-640px");
    expect(document.body.style.width).toBe("100%");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("unlocking restores the body's own styles and the exact scroll position", () => {
    document.body.style.overflow = "auto";
    const { rerender } = renderHook(({ locked }) => useScrollLock(locked), { initialProps: { locked: true } });

    rerender({ locked: false });

    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.body.style.overflow).toBe("auto");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, left: 0, behavior: "instant" });
  });

  it("unlocks when the component goes away", () => {
    const { unmount } = renderHook(() => useScrollLock(true));

    unmount();

    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, left: 0, behavior: "instant" });
  });
});
