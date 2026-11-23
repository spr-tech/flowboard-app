import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSecondsUntil } from "./useSecondsUntil";

const NOW = new Date("2026-11-23T12:00:00.000Z");
const inMs = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

beforeEach(() => vi.useFakeTimers({ now: NOW }));
afterEach(() => vi.useRealTimers());

describe("useSecondsUntil", () => {
  it("counts down once a second, rounding up, and stops at 0", () => {
    const { result } = renderHook(() => useSecondsUntil(inMs(2_500)));
    expect(result.current).toBe(3);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(2);
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current).toBe(0);
  });

  it("is 0 for nothing to wait for, or a time already passed", () => {
    expect(renderHook(() => useSecondsUntil(null)).result.current).toBe(0);
    expect(renderHook(() => useSecondsUntil(inMs(-5_000))).result.current).toBe(0);
  });

  it("counts from the real time when a new target arrives long after the last one ended", () => {
    const { result, rerender } = renderHook(({ until }) => useSecondsUntil(until), {
      initialProps: { until: inMs(1_000) as string | null },
    });
    act(() => vi.advanceTimersByTime(120_000));
    expect(result.current).toBe(0);

    rerender({ until: inMs(180_000) });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(60);
  });
});
