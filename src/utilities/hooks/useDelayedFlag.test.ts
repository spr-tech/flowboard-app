import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDelayedFlag } from "./useDelayedFlag";

describe("useDelayedFlag", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const render = (active: boolean) => renderHook(({ on }) => useDelayedFlag(on, 200), { initialProps: { on: active } });

  it("stays false for a load that finishes within 200ms", () => {
    const { result, rerender } = render(true);

    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe(false);
    rerender({ on: false });
    act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe(false);
  });

  it("turns true once a load has lasted 200ms", () => {
    const { result } = render(true);

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));

    expect(result.current).toBe(true);
  });

  it("turns false the moment loading ends, and waits again for the next load", () => {
    const { result, rerender } = render(true);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);

    rerender({ on: false });
    expect(result.current).toBe(false);

    rerender({ on: true });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);
  });

  it("never turns true while inactive", () => {
    const { result } = render(false);

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toBe(false);
  });
});
