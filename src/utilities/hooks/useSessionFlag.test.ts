import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionFlag } from "./useSessionFlag";

beforeEach(() => window.sessionStorage.clear());

describe("useSessionFlag", () => {
  it("starts unset, and once set, stays set for this tab's session", () => {
    const first = renderHook(() => useSessionFlag("flag"));
    expect(first.result.current[0]).toBe(false);

    act(() => first.result.current[1]());
    expect(first.result.current[0]).toBe(true);
    expect(window.sessionStorage.getItem("flag")).toBe("1");

    // A reload in the same tab reads it back; other keys are separate.
    expect(renderHook(() => useSessionFlag("flag")).result.current[0]).toBe(true);
    expect(renderHook(() => useSessionFlag("other")).result.current[0]).toBe(false);
  });

  it("still works in memory when storage is blocked", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    const { result } = renderHook(() => useSessionFlag("flag"));
    expect(result.current[0]).toBe(false);

    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
